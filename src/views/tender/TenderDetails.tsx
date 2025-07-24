// src/views/tender/TenderDetails.tsx
import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import {
    Box, Typography, Grid, Button, Alert, Stack,
    CircularProgress,
    Paper, TextField, InputAdornment, FormControl, Select, MenuItem as MuiMenuItem,
    TableContainer, Table, TableHead, TableRow, TableCell, TableBody,
    IconButton,
    List,
    Checkbox,
    ListItemText,
    Backdrop
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import {
    IconPlus, IconSearch,
    IconEdit, IconTrash, IconCloudUpload, IconCheck,
    IconChevronDown,
    IconChevronRight,
    IconFileExport,
    IconDownload
} from '@tabler/icons-react';
import DoNotDisturbOnRoundedIcon from '@mui/icons-material/DoNotDisturbOnRounded';
import DoneRoundedIcon from '@mui/icons-material/DoneRounded';


import CustomTextField from 'src/components/forms/theme-elements/CustomTextField';
import BlankCard from 'src/components/shared/BlankCard';
import "./style.css"
import { useTooltip, CustomTooltip } from 'src/context/TooltipContext';

import * as XLSX from 'xlsx';

import axios from 'axios';

import server from 'src/assets/address.json';

// YENİ: Yeni modal bileşenlerini içeri aktar
import RegisterUnregisteredItemModal from './RegisterUnregisteredItemModal';
import RegisterUnregisteredCategoryModal from './RegisterUnregisteredCategoryModal';


// ===========================================================================
// TYPE DEFINITIONS (UPDATED FOR NEW API STRUCTURE)
// ===========================================================================
interface TenderDetailRow {
    id: number;
    siraNo: number;
    eskiPoz: string;
    tedasNo: number;
    anaNo: number;
    altNo: number;
    description: string;
    olcuBrimi: string;
    malzeme: number;
    malzemeYuklenici: number;
    montaj: number;
    demontaj: number;
    demontajMontaj: number;
    birimFiyatMalzeme: number;
    birimFiyatMontaj: number;
    birimFiyatDemontaj: number;
    birimFiyatDemontajMontaj: number;
    aciklama: string;
    categoryPercentage: number | null;
    isCategory: boolean;
    toplamMalzeme: number;
    toplamMontaj: number;
    toplamDemontaj: number;
    toplamDemontajdanMontaj: number;
    isUnregisteredItem: boolean;
    itemId: number | null;
    isFromExcel: boolean;
}

export interface ApiCategoryType {
    id: string; // Added based on your API response
    name: string;
    parentId: string | null;
    categories: ApiCategoryType[];
    depth?: number;
    percent?: number;
    createAt?: string; // Added based on your API response
    recordStatus?: number; // Added based on your API response
}

export interface ApiItemType {
    id: number;
    name: string;
    category: { id: string; name?: string; };
    unit: { title: string; };
    code?: string | null; // Added based on your API response
    description?: string; // Added based on your API response
    createAt?: string; // Added based on your API response
    recordStatus?: number; // Added based on your API response
    abbreviation?: string; // Added based on your API response
}

interface UnifiedTreeNode {
    id: string;
    name: string;
    type: 'category' | 'item';
    depth: number;
    children: UnifiedTreeNode[];
    originalData?: ApiItemType | ApiCategoryType;
}

interface GetItemByIdApiResponse {
    success: boolean;
    httpStatusCode: number;
    httpStatusCodeName: string;
    message: string;
    data: {
        id: number;
        name: string;
        description: string;
        abbreviation: string;
        recordStatus: number;
        createAt: string;
        category: {
            id: string;
            name: string;
            depth: number;
            createAt: string;
            recordStatus: number;
        };
        unit: {
            id: string;
            title: string;
            recordStatus: number;
            createAt: string;
        };
    };
    errors: any[];
}

// UPDATED: Assuming API now sends numbers directly, not strings like "$0.00"
interface TenderDetailFromApi {
    id: number;
    firmProcuredItemQuantities: number; // Changed to number
    eskiPoz: string | null; // Changed to string | null
    tedas: string | null;   // Changed to string | null
    ana: string | null;     // Changed to string | null
    alt: string | null;     // Changed to string | null
    ourProcuredItemQuantities: number; // Changed to number
    demontaj: number;         // Changed to number
    demontajMontaj: number;   // Changed to number
    firmProcuredItemPrice: number; // Changed to number
    ourProcuredItemPrice: number;  // Changed to number
    montajPrice: number;           // Changed to number
    demontajPrice: number;        // Changed to number
    demontajMontajPrice: number;   // Changed to number
    malzemeTutari: number;         // Added based on your API response
    montajTutari: number;          // Added based on your API response
    demontajTutari: number;        // Added based on your API response
    dMMTutari: number;             // Added based on your API response
    recordStatus: number; // Added based on your API response
    createAt: string;     // Added based on your API response
    item: ApiItemType;    // Added based on your API response
}

// UPDATED: Assuming 'id' is present and 'details' is 'tenderDetails'
interface TenderCategoryFromApi {
    id: string; // Added based on your API response
    percent: number;
    description: string;
    recordStatus: number; // Added based on your API response
    createAt: string;     // Added based on your API response
    tenderDetails: TenderDetailFromApi[]; // Renamed 'details' to 'tenderDetails'
}

interface GetTenderByIdRawResponse {
    success: boolean;
    httpStatusCode: number;
    httpStatusCodeName: string;
    message: string;
    data: {
        id: string; // Changed to string as per your API response ("id": "21")
        title: string;
        createAt: string;
        recordStatus: number;
        status: number | null;
        statusDate: string | null;
        tenderCategories: TenderCategoryFromApi[]; // Using the updated TenderCategoryFromApi
    };
    errors: any[];
}


// ===========================================================================
// UTILITY FUNCTIONS (parseAndCleanFloat/Int are kept for user inputs)
// ===========================================================================

const buildCombinedTree = (categories: ApiCategoryType[], items: ApiItemType[], depth = 0): UnifiedTreeNode[] => {
    return categories.map(category => {
        const childItems: UnifiedTreeNode[] = items
            .filter(item => item.category.id === category.id)
            .map(item => ({
                id: `item-${item.id}`,
                name: item.name,
                type: 'item',
                depth: depth + 1,
                children: [],
                originalData: item,
            } as UnifiedTreeNode));

        const childCategories: UnifiedTreeNode[] = category.categories && category.categories.length > 0
            ? buildCombinedTree(category.categories, items, depth + 1)
            : [];

        return {
            id: `cat-${category.id}`,
            name: category.name,
            type: 'category',
            depth: depth,
            children: [...childCategories, ...childItems].sort((a, b) => a.name.localeCompare(b.name)),
            originalData: category,
        } as UnifiedTreeNode;
    }).sort((a, b) => a.name.localeCompare(b.name));
};

const findNodePathPure = (nodes: UnifiedTreeNode[], targetId: string, currentPath: UnifiedTreeNode[] = []): UnifiedTreeNode[] => {
    for (const node of nodes) {
        const newPath = [...currentPath, node];
        if (node.id === targetId) {
            return newPath;
        }
        if (node.children && node.children.length > 0) {
            const foundPath = findNodePathPure(node.children, targetId, newPath);
            if (foundPath.length > 0) {
                return foundPath;
            }
        }
    }
    return [];
};

const filterTree = (nodes: UnifiedTreeNode[], searchTerm: string): UnifiedTreeNode[] => {
    if (!searchTerm) {
        return nodes;
    }

    const lowerCaseSearchTerm = searchTerm.toLowerCase();

    return nodes.reduce<UnifiedTreeNode[]>((acc, node) => {
        const isDirectMatch = node.name.toLowerCase().includes(lowerCaseSearchTerm);
        let childrenFiltered: UnifiedTreeNode[] = [];

        if (node.children && node.children.length > 0) {
            childrenFiltered = filterTree(node.children, searchTerm);
        }

        if (isDirectMatch || childrenFiltered.length > 0) {
            const finalChildren = isDirectMatch
                ? [...node.children].sort((a, b) => a.name.localeCompare(b.name))
                : childrenFiltered;

            acc.push({ ...node, children: finalChildren });
        }
        return acc;
    }, []);
};

const getNextAvailableSiraNo = (currentGridData: TenderDetailRow[]): number => {
    if (currentGridData.length === 0) {
        return 1;
    }
    const maxSiraNo = Math.max(...currentGridData.map(row => row.siraNo));
    return maxSiraNo + 1;
};

const isItemDescriptionDuplicate = (
    description: string,
    currentGridData: TenderDetailRow[],
    excludeId: number | null = null
): boolean => {
    const lowerCaseDescription = description.toLowerCase().trim();
    return currentGridData.some(row =>
        row.id !== excludeId &&
        row.description.toLowerCase().trim() === lowerCaseDescription
    );
};

// KEPT for user inputs
const parseAndCleanFloat = (value: string | number): number => {
    if (typeof value === 'number') {
        return value;
    }
    let cleanedValue = String(value).replace(/,/g, '.');

    const parts = cleanedValue.split('.');
    if (parts.length > 2) {
        cleanedValue = parts[0] + '.' + parts.slice(1).join('');
    }

    cleanedValue = cleanedValue.replace(/[^0-9.]/g, '');

    const parsed = parseFloat(cleanedValue);
    return isNaN(parsed) ? 0 : parsed;
};

// KEPT for user inputs
const parseAndCleanInt = (value: string | number): number => {
    if (typeof value === 'number') {
        return value;
    }
    const cleanedValue = String(value).replace(/,/g, '').replace(/[^0-9]/g, '');
    const parsed = parseInt(cleanedValue, 10);
    return isNaN(parsed) ? 0 : parsed;
};

const formatIntForDisplayNoGrouping = (value: number | null): string => {
    if (value === null || isNaN(value)) return '0';
    return value.toLocaleString('en-US', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
        useGrouping: false
    });
};

const formatNumber = (value: number | null, decimalPlaces: number = 0, useGrouping: boolean = true) => {
    if (value === null || isNaN(value)) return '0';
    return value.toLocaleString('en-US', {
        minimumFractionDigits: decimalPlaces,
        maximumFractionDigits: decimalPlaces,
        useGrouping: useGrouping
    });
};

const formatInputNumberForDisplay = (value: number | null, decimalPlaces: number = 0): string => {
    if (value === null || isNaN(value)) return '';
    return value.toLocaleString('en-US', {
        minimumFractionDigits: decimalPlaces,
        maximumFractionDigits: decimalPlaces,
        useGrouping: false
    });
};

const normalizeString = (str: string): string => {
    if (!str) return '';
    return str
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, "")
        .replace(/\s+/g, ' ')
        .trim()
        .toLowerCase();
};

const findNodeByIdPure = (nodes: UnifiedTreeNode[], id: string): UnifiedTreeNode | undefined => {
    for (const node of nodes) {
        if (node.id === id) {
            return node;
        }
        if (node.children && node.children.length > 0) {
            const found = findNodeByIdPure(node.children, id);
            if (found) return found;
        }
    }
    return undefined;
};

const findNodeByNameAndTypePure = (nodes: UnifiedTreeNode[], normalizedSearchName: string, type: 'category' | 'item'): UnifiedTreeNode | undefined => {
    for (const node of nodes) {
        const normalizedNodeName = normalizeString(node.name);

        if (normalizedNodeName === normalizedSearchName && node.type === type) {
            return node;
        }
        if (node.children && node.children.length > 0) {
            const found = findNodeByNameAndTypePure(node.children, normalizedSearchName, type);
            if (found) return found;
        }
    }
    return undefined;
};



// ===========================================================================
// REACT COMPONENT STARTS HERE
// ===========================================================================

const TenderDetails = () => {
    const { tenderId } = useParams<{ tenderId: string }>();
    const location = useLocation();
    const navigate = useNavigate();

    const { isTooltipGloballyEnabled } = useTooltip();
    const theme = useTheme();

    const fileInputRef = useRef<HTMLInputElement>(null);
    const tableContainerRef = useRef<HTMLDivElement>(null);

    const initialTenderTitle = useMemo(() => {
        const queryParams = new URLSearchParams(location.search);
        return queryParams.get('title') || `İhale Yükleniyor... (ID: ${tenderId})`;
    }, [location.search, tenderId]);

    const [tenderTitle, setTenderTitle] = useState<string>(initialTenderTitle);
    const [gridData, setGridData] = useState<TenderDetailRow[]>([]);
    const [loading, setLoading] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isSavingAll, setIsSavingAll] = useState<boolean>(false);
    const [fileUploadedSuccessfully, setFileUploadedSuccessfully] = useState<boolean>(false);

    const [displayMode, setDisplayMode] = useState<'withCategory' | 'withoutCategory'>('withoutCategory');

    const showAlert = useCallback((message: string, severity: 'success' | 'error' | 'warning' | 'info') => {
        setAlertMessage(message);
        setAlertSeverity(severity);
        setTimeout(() => clearAlert(), 5000);
    }, []);

    const clearAlert = useCallback(() => setAlertMessage(null), []);

    const [alertMessage, setAlertMessage] = useState<string | null>(null);
    const [alertSeverity, setAlertSeverity] = useState<'success' | 'error' | 'warning' | 'info'>('info');

    const [newRecordTreeSearchTerm, setNewRecordTreeSearchTerm] = useState('');
    const [newRecordSelectedUnifiedNodeId, setNewRecordSelectedUnifiedNodeId] = useState<string | null>(null);
    const [isNewRecordTreeSelectOpen, setIsNewRecordTreeSelectOpen] = useState(false);
    const [newRecordManualInput, setNewRecordManualInput] = useState('');

    const [editingRowTreeSearchTerm, setEditingRowTreeSearchTerm] = useState('');
    const [editingRowSelectedUnifiedNodeId, setEditingRowSelectedUnifiedNodeId] = useState<string | null>(null);
    const [isEditingRowTreeSelectOpen, setIsEditingRowTreeSelectOpen] = useState(false);


    const [loadingTree, setLoadingTree] = useState(false);
    const [combinedTreeData, setCombinedTreeData] = useState<UnifiedTreeNode[]>([]);
    const [isTreeDataLoaded, setIsTreeDataLoaded] = useState(false);

    const [gridSearchTerm, setGridSearchTerm] = useState<string>('');

    const initialDisplayLimit = 60;
    const loadMoreStep = 5;

    const [currentDisplayCount, setCurrentDisplayCount] = useState(initialDisplayLimit);
    const [hasMoreData, setHasMoreData] = useState(true);

    // This ref should only indicate if initial tender details were loaded
    // not if general tree data was loaded
    const initialTenderDetailsLoadRef = useRef(false);

    const [newRecordRow, setNewRecordRow] = useState<TenderDetailRow>({
        id: 0, siraNo: 0, eskiPoz: '', tedasNo: 0, anaNo: 0, altNo: 0,
        description: '', olcuBrimi: '', malzeme: 0,
        malzemeYuklenici: 0, montaj: 0, demontaj: 0, demontajMontaj: 0,
        birimFiyatMalzeme: 0, birimFiyatMontaj: 0, birimFiyatDemontaj: 0, birimFiyatDemontajMontaj: 0,
        toplamMalzeme: 0, toplamMontaj: 0, toplamDemontaj: 0, toplamDemontajdanMontaj: 0,
        isUnregisteredItem: false, itemId: null, aciklama: '',
        categoryPercentage: null, isCategory: false, isFromExcel: false,
    });

    const [birimFiyatMalzemeNew, setBirimFiyatMalzemeNew] = useState<string>("0");
    const [birimFiyatMontajNew, setBirimFiyatMontajNew] = useState<string>("0");
    const [birimFiyatDemontajNew, setBirimFiyatDemontajNew] = useState<string>("0");
    const [birimFiyatDemontajMontajNew, setBirimFiyatDemontajMontajNew] = useState<string>("0");

    const [editingBirimFiyatMalzeme, setEditingBirimFiyatMalzeme] = useState<string>('');
    const [editingBirimFiyatMontaj, setEditingBirimFiyatMontaj] = useState<string>('');
    const [editingBirimFiyatDemontaj, setEditingBirimFiyatDemontaj] = useState<string>('');
    const [editingBirimFiyatDemontajMontaj, setEditingBirimFiyatDemontajMontaj] = useState<string>('');

    const [editingRowId, setEditingRowId] = useState<number | null>(null);
    const [editingRowData, setEditingRowData] = useState<TenderDetailRow | null>(null);

    const [openRegisterItemModal, setOpenRegisterItemModal] = useState(false);
    const [itemToRegister, setItemToRegister] = useState<Partial<TenderDetailRow> | null>(null);

    const [openRegisterCategoryModal, setOpenRegisterCategoryModal] = useState(false);
    const [categoryToRegister, setCategoryToRegister] = useState<Partial<TenderDetailRow> | null>(null);

    const [templateWorkbookBuffer, setTemplateWorkbookBuffer] = useState<ArrayBuffer | null>(null);


    const newRecordSelectedNodePath = useMemo(() => {
        if (!newRecordSelectedUnifiedNodeId) return new Set<string>();
        const path = findNodePathPure(combinedTreeData, newRecordSelectedUnifiedNodeId);
        return new Set(path.map(node => node.id));
    }, [newRecordSelectedUnifiedNodeId, combinedTreeData]);

    const isNodeAncestorOfNewRecordSelected = useCallback((nodeId: string, specificSelectedId: string | null): boolean => {
        if (!specificSelectedId) return false;
        return newRecordSelectedNodePath.has(nodeId);
    }, [newRecordSelectedNodePath]);

    const filteredTreeForNewRecordDisplay = useMemo(() =>
        filterTree(combinedTreeData, newRecordTreeSearchTerm),
        [combinedTreeData, newRecordTreeSearchTerm]
    );

    const editingRowSelectedNodePath = useMemo(() => {
        if (!editingRowSelectedUnifiedNodeId) return new Set<string>();
        const path = findNodePathPure(combinedTreeData, editingRowSelectedUnifiedNodeId);
        return new Set(path.map(node => node.id));
    }, [editingRowSelectedUnifiedNodeId, combinedTreeData]);

    const isNodeAncestorOfEditingRowSelected = useCallback((nodeId: string, specificSelectedId: string | null): boolean => {
        if (!specificSelectedId) return false;
        return editingRowSelectedNodePath.has(nodeId);
    }, [editingRowSelectedNodePath]);

    const filteredTreeForEditingRowDisplay = useMemo(() =>
        filterTree(combinedTreeData, editingRowTreeSearchTerm),
        [combinedTreeData, editingRowTreeSearchTerm]
    );

    const calculateTotals = useCallback((
        row: Partial<TenderDetailRow>,
        forceRecalculate: boolean = false
    ): TenderDetailRow => {
        if (row.isFromExcel && !forceRecalculate) {
            return {
                id: row.id ?? 0, siraNo: row.siraNo ?? 0, eskiPoz: row.eskiPoz ?? '',
                tedasNo: row.tedasNo ?? 0, anaNo: row.anaNo ?? 0, altNo: row.altNo ?? 0,
                description: row.description ?? '', olcuBrimi: row.olcuBrimi ?? '',
                malzeme: row.malzeme ?? 0, malzemeYuklenici: row.malzemeYuklenici ?? 0,
                montaj: (row.malzeme ?? 0) + (row.malzemeYuklenici ?? 0), // This calculation is correct
                demontaj: row.demontaj ?? 0, demontajMontaj: row.demontajMontaj ?? 0,
                birimFiyatMalzeme: row.birimFiyatMalzeme ?? 0, birimFiyatMontaj: row.birimFiyatMontaj ?? 0,
                birimFiyatDemontaj: row.birimFiyatDemontaj ?? 0, birimFiyatDemontajMontaj: row.birimFiyatDemontajMontaj ?? 0,
                aciklama: row.aciklama ?? '', categoryPercentage: row.categoryPercentage ?? null,
                isCategory: row.isCategory ?? false, isUnregisteredItem: row.isUnregisteredItem ?? false,
                itemId: row.itemId ?? null, isFromExcel: row.isFromExcel ?? false,
                toplamMalzeme: row.toplamMalzeme ?? 0, toplamMontaj: row.toplamMontaj ?? 0,
                toplamDemontaj: row.toplamDemontaj ?? 0, toplamDemontajdanMontaj: row.toplamDemontajdanMontaj ?? 0,
            };
        }

        const malzeme = row.malzeme ?? 0;
        const malzemeMiktari = row.malzemeYuklenici ?? 0;
        const montajMiktari = malzeme + malzemeMiktari;

        const demontajMiktari = row.demontaj ?? 0;
        const dmmMiktari = row.demontajMontaj ?? 0;

        const birimFiyatMalzeme = row.birimFiyatMalzeme ?? 0;
        const birimFiyatMontaj = row.birimFiyatMontaj ?? 0;
        const birimFiyatDemontaj = row.birimFiyatDemontaj ?? 0;
        const birimFiyatDemontajMontaj = row.birimFiyatDemontajMontaj ?? 0;

        let percentageFactor = 1;
        if (row.isCategory) {
            percentageFactor = (row.categoryPercentage ?? 100) / 100;
        } else if (row.categoryPercentage !== null && row.categoryPercentage !== undefined) {
            percentageFactor = row.categoryPercentage / 100;
        }

        const calculatedToplamMalzeme = malzemeMiktari * birimFiyatMalzeme;
        const calculatedToplamMontaj = montajMiktari * birimFiyatMontaj;
        const calculatedToplamDemontaj = demontajMiktari * birimFiyatDemontaj * percentageFactor;
        const calculatedToplamDemontajdanMontaj = dmmMiktari * birimFiyatDemontajMontaj * percentageFactor;

        return {
            id: row.id ?? 0, siraNo: row.siraNo ?? 0, eskiPoz: row.eskiPoz ?? '',
            tedasNo: row.tedasNo ?? 0, anaNo: row.anaNo ?? 0, altNo: row.altNo ?? 0,
            description: row.description ?? '', olcuBrimi: row.olcuBrimi ?? '',
            malzeme: malzeme, malzemeYuklenici: malzemeMiktari, montaj: montajMiktari,
            demontaj: demontajMiktari, demontajMontaj: dmmMiktari,
            birimFiyatMalzeme: birimFiyatMalzeme, birimFiyatMontaj: birimFiyatMontaj,
            birimFiyatDemontaj: birimFiyatDemontaj, birimFiyatDemontajMontaj: birimFiyatDemontajMontaj,
            toplamMalzeme: calculatedToplamMalzeme, toplamMontaj: calculatedToplamMontaj,
            toplamDemontaj: calculatedToplamDemontaj, toplamDemontajdanMontaj: calculatedToplamDemontajdanMontaj,
            isUnregisteredItem: row.isUnregisteredItem ?? false, itemId: row.itemId ?? null,
            aciklama: row.aciklama ?? '', categoryPercentage: row.categoryPercentage ?? null,
            isCategory: row.isCategory ?? false, isFromExcel: row.isFromExcel ?? false,
        } as TenderDetailRow;
    }, []);

    const processedAndFilteredGridData = useMemo(() => {
        let currentData = [...gridData];

        currentData = currentData.map(row => {
            let updatedRow = { ...row };

            const normalizedRowDescription = normalizeString(row.description);
            let foundNode: UnifiedTreeNode | undefined;
            let isUnregistered: boolean;
            let currentItemId: number | null = null;

            if (row.isCategory) {
                foundNode = findNodeByNameAndTypePure(combinedTreeData, normalizedRowDescription, 'category');
                isUnregistered = !foundNode;
                currentItemId = null;
            } else {
                foundNode = findNodeByNameAndTypePure(combinedTreeData, normalizedRowDescription, 'item');
                isUnregistered = !foundNode;
                currentItemId = (foundNode?.originalData as ApiItemType)?.id ?? null;
            }

            updatedRow.isUnregisteredItem = isUnregistered;
            updatedRow.itemId = currentItemId;

            if (!row.isCategory && updatedRow.itemId !== null && combinedTreeData.length > 0) {
                const itemNodeInTree = findNodeByIdPure(combinedTreeData, `item-${updatedRow.itemId}`);
                if (itemNodeInTree && itemNodeInTree.originalData && 'category' in itemNodeInTree.originalData && itemNodeInTree.originalData.category?.id) {
                    const parentCategoryNodeInTree = findNodeByIdPure(combinedTreeData, `cat-${itemNodeInTree.originalData.category.id}`);
                    if (parentCategoryNodeInTree && parentCategoryNodeInTree.type === 'category' && parentCategoryNodeInTree.originalData && 'percent' in parentCategoryNodeInTree.originalData) {
                        const categoryPercent = (parentCategoryNodeInTree.originalData as ApiCategoryType).percent;
                        if (categoryPercent !== undefined && categoryPercent !== null && updatedRow.categoryPercentage !== categoryPercent) {
                            updatedRow.categoryPercentage = categoryPercent;
                        }
                    }
                }
            }
            return calculateTotals(updatedRow, true);
        });

        if (displayMode === 'withoutCategory') {
            currentData = currentData.filter(row => !row.isCategory);
        }

        let currentSiraNo = 1;
        currentData = currentData.map(row => ({
            ...row,
            siraNo: currentSiraNo++
        }));

        if (gridSearchTerm) {
            const lowerCaseSearchTerm = gridSearchTerm.toLowerCase();
            currentData = currentData.filter(row =>
                row.description.toLowerCase().includes(lowerCaseSearchTerm) ||
                row.aciklama.toLowerCase().includes(lowerCaseSearchTerm)
            );
        }
        return currentData;
    }, [gridData, displayMode, gridSearchTerm, combinedTreeData, calculateTotals]);


    const displayedGridData = useMemo(() => {
        return processedAndFilteredGridData.slice(0, currentDisplayCount);
    }, [processedAndFilteredGridData, currentDisplayCount]);

    
    // =======================================================================
    // NEW: Function to fetch & build tree data (only for initial load)
    // =======================================================================
    const fetchDataAndBuildTree = useCallback(async () => {
        console.log("--- fetchDataAndBuildTree Called for Initial Load ---");
        setLoadingTree(true);
        const authToken = localStorage.getItem('authToken');
        if (!authToken) {
            showAlert('Oturumunuzun süresi doldu.', 'error');
            navigate("/");
            setLoadingTree(false);
            setIsTreeDataLoaded(false);
            return;
        }
        try {
            const [categoriesResponse, itemsResponse] = await Promise.all([
                axios.get<{ data: ApiCategoryType[] }>(server.baseurl + server.baseinfo + "get-categories", { headers: { "Authorization": `Bearer ${authToken}` } }),
                axios.get<{ data: ApiItemType[] }>(server.baseurl + server.baseinfo + "get-item", { headers: { "Authorization": `Bearer ${authToken}` } })
            ]);

            const tree = buildCombinedTree(categoriesResponse.data.data || [], itemsResponse.data.data || []);
            setCombinedTreeData(tree);
            setIsTreeDataLoaded(true);
            console.log("--- fetchDataAndBuildTree: Tree data loaded successfully. IsTreeDataLoaded set to true. ---");
        } catch (error: any) {
            console.error("--- fetchDataAndBuildTree Error: ", error);
            showAlert('Kategori ve ürünler yüklenirken bir hata oluştu.', 'error');
            setIsTreeDataLoaded(false);
        } finally {
            setLoadingTree(false);
        }
    }, [navigate, showAlert]);

    // =======================================================================
    // NEW: Function to refresh combinedTreeData after a successful registration
    // This function DOES NOT touch isTreeDataLoaded state
    // =======================================================================
    const refreshCombinedTreeData = useCallback(async () => {
        console.log("--- refreshCombinedTreeData Called for Update ---");
        setLoadingTree(true);
        const authToken = localStorage.getItem('authToken');
        if (!authToken) {
            showAlert('Oturumunuzun süresi doldu.', 'error');
            navigate("/");
            setLoadingTree(false);
            return;
        }
        try {
            const [categoriesResponse, itemsResponse] = await Promise.all([
                axios.get<{ data: ApiCategoryType[] }>(server.baseurl + server.baseinfo + "get-categories", { headers: { "Authorization": `Bearer ${authToken}` } }),
                axios.get<{ data: ApiItemType[] }>(server.baseurl + server.baseinfo + "get-item", { headers: { "Authorization": `Bearer ${authToken}` } })
            ]);

            const tree = buildCombinedTree(categoriesResponse.data.data || [], itemsResponse.data.data || []);
            setCombinedTreeData(tree);
            console.log("--- refreshCombinedTreeData: Tree data updated successfully. ---");
        } catch (error: any) {
            console.error("--- refreshCombinedTreeData Error: ", error);
            showAlert('Kategori ve ürünler güncellenirken bir hata oluştu.', 'error');
        } finally {
            setLoadingTree(false);
        }
    }, [navigate, showAlert]);

    // =======================================================================
    // loadExistingTenderDetails: Handles loading tender data from API
    // This should only run ONCE on initial load or tenderId change
    // =======================================================================
    const loadExistingTenderDetails = useCallback(async () => {
        console.log("--- loadExistingTenderDetails Called ---");
        // We only proceed if tenderId exists AND tree data is loaded
        if (!tenderId || !isTreeDataLoaded) {
            console.log("--- loadExistingTenderDetails Skipped: tenderId or tree data not ready. ---");
            return;
        }

        // Only load if not already loaded for this tenderId
        if (initialTenderDetailsLoadRef.current) {
            console.log("--- loadExistingTenderDetails Skipped: Already loaded for this tenderId. ---");
            return;
        }

        setLoading(true);
        const authToken = localStorage.getItem('authToken');
        if (!authToken) {
            showAlert('Oturumunuzun süresi doldu.', 'error');
            navigate("/");
            setLoading(false);
            return;
        }

        try {
            const response = await axios.get<GetTenderByIdRawResponse>(
                server.baseurl + server.initialoperations + "get-tender-by-id/" + tenderId,
                { headers: { 'Authorization': `Bearer ${authToken}` } }
            );

            if (response.data && response.data.data) {
                const tenderData = response.data.data;
                setTenderTitle(tenderData.title || `İhale Yükleniyor... (ID: ${tenderId})`);

                let loadedDetails: TenderDetailRow[] = [];
                let currentLocalIdCounter = 1;

                if (Array.isArray(tenderData.tenderCategories)) {
                    tenderData.tenderCategories.forEach(category => {
                        const categoryRow: TenderDetailRow = calculateTotals({
                            id: currentLocalIdCounter++, siraNo: 0, eskiPoz: "",
                            tedasNo: 0, anaNo: 0, altNo: 0, description: category.description || "Kategori",
                            olcuBrimi: "", malzeme: 0, malzemeYuklenici: 0, montaj: 0, demontaj: 0, demontajMontaj: 0,
                            birimFiyatMalzeme: 0, birimFiyatMontaj: 0, birimFiyatDemontaj: 0, birimFiyatDemontajMontaj: 0,
                            toplamMalzeme: 0, toplamMontaj: 0, toplamDemontaj: 0, toplamDemontajdanMontaj: 0,
                            isUnregisteredItem: false, itemId: null, aciklama: category.description || "",
                            categoryPercentage: category.percent !== undefined && category.percent !== null ? category.percent : null,
                            isCategory: true, isFromExcel: false,
                        }, true);
                        loadedDetails.push(categoryRow);

                        if (Array.isArray(category.tenderDetails)) { // Changed 'details' to 'tenderDetails'
                            const itemDetails = category.tenderDetails.map((detail, index) => {
                                // NO PARSING NEEDED HERE IF BACKEND SENDS NUMBERS
                                const ourProcuredItemPriceNum = detail.ourProcuredItemPrice;
                                const montajPriceNum = detail.montajPrice;
                                const demontajPriceNum = detail.demontajPrice;
                                const demontajMontajPriceNum = detail.demontajMontajPrice;

                                // NO PARSING NEEDED HERE IF BACKEND SENDS NUMBERS
                                const malzeme = detail.firmProcuredItemQuantities || 0;
                                const malzemeYuklenici = detail.ourProcuredItemQuantities;
                                const demontaj = detail.demontaj;
                                const demontajMontaj = detail.demontajMontaj;

                                // NO PARSING NEEDED HERE IF BACKEND SENDS NUMBERS (or handle null/undefined if possible)
                                const tedasNo = detail.tedas !== null ? Number(detail.tedas) : 0;
                                const anaNo = detail.ana !== null ? Number(detail.ana) : 0;
                                const altNo = detail.alt !== null ? Number(detail.alt) : 0;

                                const eskiPoz = String(detail.eskiPoz || '');

                                let itemDescription: string = "N/A";
                                let itemUnit: string = "";
                                // Use detail.item directly if available and matches ApiItemType structure
                                const foundItemNode = detail.item ? findNodeByIdPure(combinedTreeData, `item-${detail.item.id}`) : undefined;

                                if (foundItemNode && foundItemNode.type === 'item' && foundItemNode.originalData) {
                                    itemDescription = (foundItemNode.originalData as ApiItemType).name;
                                    itemUnit = (foundItemNode.originalData as ApiItemType).unit?.title || "";
                                } else if (detail.item) {
                                    // Fallback if item is not found in local tree, but exists in API response
                                    itemDescription = detail.item.name || "N/A";
                                    itemUnit = detail.item.unit?.title || "";
                                }

                                const aciklama = ""; // Your API response doesn't have 'aciklama' at this level

                                const baseRow: Partial<TenderDetailRow> = {
                                    id: detail.id, siraNo: index + 1, eskiPoz: eskiPoz,
                                    tedasNo: tedasNo, anaNo: anaNo, altNo: altNo,
                                    description: itemDescription, olcuBrimi: itemUnit,
                                    malzeme: malzeme, malzemeYuklenici: malzemeYuklenici, montaj: (malzeme + malzemeYuklenici),
                                    demontaj: demontaj, demontajMontaj: demontajMontaj,
                                    birimFiyatMalzeme: ourProcuredItemPriceNum, birimFiyatMontaj: montajPriceNum,
                                    birimFiyatDemontaj: demontajPriceNum, birimFiyatDemontajMontaj: demontajMontajPriceNum,
                                    // Using totals directly from API if they exist, otherwise recalculate
                                    toplamMalzeme: detail.malzemeTutari, 
                                    toplamMontaj: detail.montajTutari, 
                                    toplamDemontaj: detail.demontajTutari, 
                                    toplamDemontajdanMontaj: detail.dMMTutari,
                                    isUnregisteredItem: !foundItemNode, itemId: detail.item?.id || null,
                                    aciklama: aciklama,
                                    categoryPercentage: category.percent !== undefined && category.percent !== null ? category.percent : null,
                                    isCategory: false, isFromExcel: false,
                                };
                                return calculateTotals(baseRow, true);
                            });
                            loadedDetails = loadedDetails.concat(itemDetails);
                        }
                    });
                }
                setGridData(loadedDetails);
                console.log("--- loadExistingTenderDetails: setGridData (API Loaded). New gridData length:", loadedDetails.length);
                showAlert('İhale detayları başarıyla yüklendi.', 'success');
                initialTenderDetailsLoadRef.current = true; // Set to true ONLY on successful initial load
            } else {
                setGridData([]);
                console.log("--- loadExistingTenderDetails: No tender details found or invalid API response. gridData set to empty. ---");
                showAlert('Bu ihale için detay bulunamadı veya API yanıtı geçersiz.', 'info');
                initialTenderDetailsLoadRef.current = false; // Keep false if load fails
            }
        } catch (error: any) {
            if (axios.isAxiosError(error) && error.response && error.response.status === 401) {
                localStorage.removeItem('authToken');
                navigate("/");
                showAlert('Oturumunuzun süresi doldu veya yetkiniz yok. Lütfen tekrar giriş yapın.', 'error');
            }
            console.error("--- loadExistingTenderDetails Error: ", error);
            showAlert('İhale detayları yüklenirken bir hata oluştu.', 'error');
            setGridData([]);
            console.log("--- loadExistingTenderDetails: Error loading tender details. gridData set to empty. ---");
            initialTenderDetailsLoadRef.current = false; // Keep false if load fails
        } finally {
            setLoading(false);
        }
    }, [tenderId, navigate, showAlert, calculateTotals, combinedTreeData, isTreeDataLoaded]); // Keep isTreeDataLoaded as dependency for initial check


    
    // =======================================================================
    // Master useEffect for initial data loading
    // =======================================================================
    useEffect(() => {
        console.log(`--- Master useEffect Fired. isTreeDataLoaded: ${isTreeDataLoaded}, tenderId: ${tenderId}, initialTenderDetailsLoadRef.current: ${initialTenderDetailsLoadRef.current} ---`);

        // Phase 1: Ensure tree data is loaded initially
        if (!isTreeDataLoaded) { // Only fetch tree if not already loaded
            fetchDataAndBuildTree();
            return; // Exit early, wait for isTreeDataLoaded to become true
        }

        // Phase 2: Load tender details only AFTER tree is loaded AND only once per tenderId
        if (tenderId && isTreeDataLoaded && !initialTenderDetailsLoadRef.current) {
            console.log("--- Master useEffect: Calling loadExistingTenderDetails ---");
            loadExistingTenderDetails();
            // Note: initialTenderDetailsLoadRef.current is set to true INSIDE loadExistingTenderDetails
            // to ensure it's marked as loaded only if the API call is successful.
        }

        // Cleanup: Reset initialTenderDetailsLoadRef if tenderId changes (component remounts for new tender)
        // or if this useEffect is re-fired for a new tenderId.
        return () => {
            console.log("--- Master useEffect Cleanup: Resetting initialTenderDetailsLoadRef.current to false on unmount/re-fire. ---");
            initialTenderDetailsLoadRef.current = false;
        };
    }, [tenderId, isTreeDataLoaded, fetchDataAndBuildTree, loadExistingTenderDetails]);


    // Effect to fetch Excel template
    useEffect(() => {
        fetch('/tender_template.xlsx')
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response.arrayBuffer();
            })
            .then(buffer => {
                setTemplateWorkbookBuffer(buffer);
            })
            .catch(error => {
                console.error("Error loading Excel template:", error);
                showAlert('Excel şablonu yüklenirken hata oluştu.', 'error');
            });
    }, [showAlert]);


    const addNewItemToApi = useCallback(async (itemName: string): Promise<number | null> => {
        const authToken = localStorage.getItem('authToken');
        if (!authToken) {
            showAlert('Oturumunuzun süresi doldu.', 'error');
            navigate("/");
            return null;
        }

        try {
            const defaultCategoryId = "some-default-category-id"; // You might need a dynamic default category or user selection

            const response = await axios.post(
                server.baseurl + server.baseinfo + "create-item",
                { name: itemName, categoryId: defaultCategoryId, unitId: null }, // unitId might be needed
                {
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${authToken}`
                    },
                }
            );

            if (response.data && response.data.data && response.data.data.id) {
                showAlert(`"${itemName}" ürünü başarıyla eklendi!`, 'success');
                return Number(response.data.data.id);
            } else {
                showAlert(`"${itemName}" ürünü eklenirken bir hata oluştu: ${response.data.message || 'Bilinmeyen Hata'}`, 'error');
                return null;
            }
        } catch (error: any) {
            if (axios.isAxiosError(error) && error.response && error.response.status === 401) {
                localStorage.removeItem('authToken');
                navigate("/");
                showAlert('Oturumunuzun süresi doldu veya yetkiniz yok. Lütfen tekrar giriş yapın.', 'error');
            }
            console.error("Yeni ürün API hatası:", error);
            showAlert(`Yeni ürün eklenirken bir hata oluştu: ${error.response?.data?.message || error.message}`, 'error');
            return null;
        }
    }, [navigate, showAlert]);


      const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) {
            showAlert('Lütfen bir Excel dosyası seçin.', 'warning');
            setFileUploadedSuccessfully(false);
            return;
        }

        const allowedTypes = [
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.template',
            'application/vnd.ms-excel',
            'application/vnd.ms-excel.sheet.macroEnabled.12',
            'application/vnd.ms-excel.template.macroEnabled.12',
            'application/vnd.ms-excel.addin.macroEnabled.12',
            'application/vnd.ms-excel.sheet.binary.macroEnabled.12',
            'text/csv'
        ];
        if (!allowedTypes.includes(file.type)) {
            showAlert('Sadece Excel dosyaları (.xlsx, .xls, .csv) kabul edilir.', 'error');
            setFileUploadedSuccessfully(false);
            return;
        }

        setLoading(true);
        setAlertMessage(null);
        setFileUploadedSuccessfully(false);

        const reader = new FileReader();

        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target?.result as ArrayBuffer);
                const workbook = XLSX.read(data, { type: 'array' });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                if (!worksheet['!ref']) {
                    showAlert('Excel dosyası boş veya formatı geçersiz.', 'error');
                    return;
                }
                const range = XLSX.utils.decode_range(worksheet['!ref']);

                const importedRows: TenderDetailRow[] = [];
                let currentLocalId = gridData.length > 0 ? Math.max(...gridData.map(row => row.id)) + 1 : 1;
                let duplicateCount = 0;

                const getCellValue = (rowIdx: number, colIdx: number): any => {
                    const cellAddress = XLSX.utils.encode_cell({ r: rowIdx, c: colIdx });
                    const cell = worksheet[cellAddress];
                    return cell ? cell.v : undefined;
                };

                for (let R = 4; R <= range.e.r; R++) {
                    const eskiPozValue = String(getCellValue(R, 0) || '').trim();
                    const tedasNo = parseAndCleanInt(getCellValue(R, 1));
                    const anaNo = parseAndCleanInt(getCellValue(R, 2));
                    const altNo = parseAndCleanInt(getCellValue(R, 3));

                    const descriptionValue = String(getCellValue(R, 4) || '').trim();
                    const olcuBrimi = String(getCellValue(R, 5) || '').trim();

                    const isCurrentRowCategory = (descriptionValue !== '' && olcuBrimi === '');

                    if (descriptionValue === '' && olcuBrimi === '') {
                        continue;
                    }

                    if (isItemDescriptionDuplicate(descriptionValue, gridData)) {
                        duplicateCount++;
                        continue;
                    }

                    const malzeme = parseAndCleanFloat(getCellValue(R, 6));
                    const malzemeYuklenici = parseAndCleanInt(getCellValue(R, 7));
                    const montaj = parseAndCleanInt(getCellValue(R, 8)); // This is calculated in calculateTotals
                    const demontaj = parseAndCleanInt(getCellValue(R, 9));
                    const demontajMontaj = parseAndCleanInt(getCellValue(R, 10));

                    const birimFiyatMalzeme = parseAndCleanFloat(getCellValue(R, 11));
                    const birimFiyatMontaj = parseAndCleanFloat(getCellValue(R, 12));
                    const birimFiyatDemontaj = parseAndCleanFloat(getCellValue(R, 13));
                    const birimFiyatDemontajMontaj = parseAndCleanFloat(getCellValue(R, 14));

                    const aciklama = String(getCellValue(R, 15) || '').trim();

                    const categoryPercentage = parseAndCleanFloat(getCellValue(R, 16));

                    const toplamMalzemeFromExcel = parseAndCleanFloat(getCellValue(R, 17));
                    const toplamMontajFromExcel = parseAndCleanFloat(getCellValue(R, 18));
                    const toplamDemontajFromExcel = parseAndCleanFloat(getCellValue(R, 19));
                    const toplamDemontajdanMontajFromExcel = parseAndCleanFloat(getCellValue(R, 20));

                    let existingNode: UnifiedTreeNode | undefined;
                    let isCurrentItemUnregistered = false;
                    let currentItemId: number | null = null;

                    if (isCurrentRowCategory) {
                        existingNode = findNodeByNameAndTypePure(combinedTreeData, normalizeString(descriptionValue), 'category');
                        isCurrentItemUnregistered = !existingNode;
                        currentItemId = null;
                    } else {
                        existingNode = findNodeByNameAndTypePure(combinedTreeData, normalizeString(descriptionValue), 'item');
                        isCurrentItemUnregistered = !existingNode;
                        currentItemId = (existingNode?.originalData as ApiItemType)?.id ?? null;
                    }

                    const newRow: TenderDetailRow = {
                        id: currentLocalId++, siraNo: 0, eskiPoz: eskiPozValue,
                        tedasNo: tedasNo, anaNo: anaNo, altNo: altNo, description: descriptionValue,
                        olcuBrimi: olcuBrimi, malzeme: malzeme, malzemeYuklenici: malzemeYuklenici,
                        montaj: montaj, demontaj: demontaj, demontajMontaj: demontajMontaj,
                        birimFiyatMalzeme: birimFiyatMalzeme, birimFiyatMontaj: birimFiyatMontaj,
                        birimFiyatDemontaj: birimFiyatDemontaj, birimFiyatDemontajMontaj: birimFiyatDemontajMontaj,
                        toplamMalzeme: toplamMalzemeFromExcel, toplamMontaj: toplamMontajFromExcel,
                        toplamDemontaj: toplamDemontajFromExcel, toplamDemontajdanMontaj: toplamDemontajdanMontajFromExcel,
                        isUnregisteredItem: isCurrentItemUnregistered, itemId: currentItemId,
                        aciklama: aciklama,
                        categoryPercentage: isCurrentRowCategory ? (categoryPercentage || null) : null,
                        isCategory: isCurrentRowCategory, isFromExcel: true,
                    };
                    importedRows.push(newRow);
                }

                setGridData(prev => {
                    const updatedGrid = [...prev, ...importedRows];
                    console.log("--- handleFileUpload: setGridData (Excel Imported). New gridData length:", updatedGrid.length);
                    return updatedGrid;
                });
                if (importedRows.length > 0) {
                    let successMessage = `Excel dosyası başarıyla yüklendi ve tablo güncellendi!`;
                    if (duplicateCount > 0) {
                        successMessage += ` ${duplicateCount} adet yinelenen kayıt atlandı.`;
                        showAlert(successMessage, 'warning');
                    } else {
                        showAlert(successMessage, 'success');
                    }
                    setFileUploadedSuccessfully(true);
                } else {
                    if (duplicateCount > 0) {
                        showAlert(`Hiçbir kayıt eklenemedi. ${duplicateCount} adet yinelenen kayıt atlandı.`, 'info');
                    } else {
                        showAlert('Excel dosyasında eklenecek geçerli kayıt bulunamadı.', 'info');
                    }
                    setFileUploadedSuccessfully(false);
                }

            } catch (error: any) {
                if (axios.isAxiosError(error) && error.response && error.response.status === 401) {
                    localStorage.removeItem('authToken');
                    navigate("/");
                    showAlert('Oturumunuzun süresi doldu veya yetkiniz yok. Lütfen tekrar giriş yapın.', 'error');
                }
                console.error("Excel işleme hatası:", error);
                showAlert('Excel dosyası işlenirken bir hata oluştu. Lütfen dosyanın formatını kontrol edin.', 'error');
                setFileUploadedSuccessfully(false);
            } finally {
                setLoading(false);
                if (fileInputRef.current) {
                    fileInputRef.current.value = '';
                }
            }
        };
        reader.readAsArrayBuffer(file);
    };


    const handleNewRecordInputChange = useCallback((
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
    ) => {
        const target = e.target as HTMLInputElement | HTMLTextAreaElement;
        const { name, value } = target;

        let cleanedValue = value;
        let parsedNumber: number;

        setNewRecordRow(prev => {
            let updatedRow = { ...prev, isFromExcel: false };
            if (['birimFiyatMalzeme', 'birimFiyatMontaj', 'birimFiyatDemontaj', 'birimFiyatDemontajMontaj',
                'malzeme', 'categoryPercentage'].includes(name)) {
                const numericValue = value.replace(/,/g, '.');
                if (numericValue.startsWith('.')) {
                    cleanedValue = '0' + numericValue;
                } else {
                    const parts = numericValue.split('.');
                    cleanedValue = parts[0];
                    if (parts.length > 1) {
                        cleanedValue += '.' + parts.slice(1).join('').replace(/[^0-9]/g, '');
                    }
                    cleanedValue = cleanedValue.replace(/[^0-9.]/g, '');
                }

                if (name === 'birimFiyatMalzeme') setBirimFiyatMalzemeNew(cleanedValue);
                else if (name === 'birimFiyatMontaj') setBirimFiyatMontajNew(cleanedValue);
                else if (name === 'birimFiyatDemontaj') setBirimFiyatDemontajNew(cleanedValue);
                else if (name === 'birimFiyatDemontajMontaj') setBirimFiyatDemontajMontajNew(cleanedValue);

                parsedNumber = parseFloat(cleanedValue) || 0;
                updatedRow = { ...updatedRow, [name]: parsedNumber };

                if (name === 'categoryPercentage') {
                    if (updatedRow.isCategory) {
                        updatedRow.categoryPercentage = parsedNumber;
                    } else {
                        updatedRow.categoryPercentage = null;
                    }
                }
            } else if (['malzemeYuklenici', 'demontaj', 'demontajMontaj', 'tedasNo', 'anaNo', 'altNo'].includes(name)) {
                cleanedValue = value.replace(/[^0-9]/g, '');
                parsedNumber = parseInt(cleanedValue, 10) || 0;
                updatedRow = { ...updatedRow, [name]: parsedNumber };
            } else if (name === 'newRecordManualInput') {
                setNewRecordManualInput(String(value));
                updatedRow.description = String(value);
                updatedRow.isCategory = String(value).trim() !== '' && updatedRow.olcuBrimi.trim() === '';
                if (!updatedRow.isCategory) updatedRow.categoryPercentage = null;
            } else {
                updatedRow = { ...updatedRow, [name as keyof TenderDetailRow]: value as any };
                updatedRow.isCategory = updatedRow.description.trim() !== '' && updatedRow.olcuBrimi.trim() === '';
                if (!updatedRow.isCategory) updatedRow.categoryPercentage = null;
            }
            return calculateTotals(updatedRow, true);
        });
    }, [calculateTotals, setNewRecordRow, setBirimFiyatMalzemeNew, setBirimFiyatMontajNew, setBirimFiyatDemontajNew, setBirimFiyatDemontajMontajNew]);


    const fetchItemUnitById = useCallback(async (itemId: string): Promise<string | null> => {
        const authToken = localStorage.getItem('authToken');
        if (!authToken) {
            showAlert('Oturumunuzun süresi doldu.', 'error');
            navigate("/");
            return null;
        }
        try {
            const response = await axios.get<GetItemByIdApiResponse>(
                server.baseurl + server.baseinfo + "get-item-by-id/" + Number(itemId),
                { headers: { "Authorization": `Bearer ${authToken}` } }
            );
            if (response.data && response.data.success && response.data.data && response.data.data.unit) {
                return response.data.data.unit.title;
            }
            return null;
        } catch (error: any) {
            if (axios.isAxiosError(error) && error.response && error.response.status === 401) {
                localStorage.removeItem('authToken');
                navigate("/");
                showAlert('Oturumunuzun süresi doldu veya yetkiniz yok. Lütfen tekrar giriş yapın.', 'error');
            }
            console.error("Ölçü bilgisi yüklenirken hata oluştu:", error);
            showAlert('Ölçü bilgisi yüklenirken bir hata oluştu.', 'error');
            return null;
        }
    }, [navigate, showAlert]);


    const handleNewRecordTreeSelection = useCallback(async (node: UnifiedTreeNode) => {
        if (node.type === 'item') {
            setNewRecordSelectedUnifiedNodeId(node.id);

            const nodeIdNum = (node.originalData as ApiItemType)?.id ?? null;

            setNewRecordRow(prev => {
                const updatedRow = {
                    ...prev,
                    description: node.name,
                    itemId: nodeIdNum,
                    isCategory: false,
                    categoryPercentage: null,
                    isFromExcel: false,
                };
                return calculateTotals(updatedRow, true);
            });

            setNewRecordManualInput('');
            setNewRecordTreeSearchTerm('');
            setIsNewRecordTreeSelectOpen(false);

            const itemIdForApi = (node.originalData as ApiItemType)?.id ? String((node.originalData as ApiItemType).id) : null;
            if (itemIdForApi) {
                const unitTitle = await fetchItemUnitById(itemIdForApi);
                setNewRecordRow(prev => ({
                    ...prev,
                    olcuBrimi: unitTitle || '',
                }));
            } else {
                setNewRecordRow(prev => ({ ...prev, olcuBrimi: '' }));
            }
        }
    }, [calculateTotals, fetchItemUnitById]);


    const handleEditRecordTreeSelection = useCallback(async (node: UnifiedTreeNode) => {
        if (node.type === 'item') {
            setEditingRowSelectedUnifiedNodeId(node.id);

            const nodeIdNum = (node.originalData as ApiItemType)?.id ?? null;

            setEditingRowData(prev => {
                const baseRow = prev || {
                    id: 0, siraNo: 0, eskiPoz: '', tedasNo: 0, anaNo: 0, altNo: 0,
                    description: '', olcuBrimi: '', malzeme: 0,
                    malzemeYuklenici: 0, montaj: 0, demontaj: 0, demontajMontaj: 0,
                    birimFiyatMalzeme: 0, birimFiyatMontaj: 0, birimFiyatDemontaj: 0, birimFiyatDemontajMontaj: 0,
                    aciklama: '', categoryPercentage: null, isCategory: false,
                    toplamMalzeme: 0, toplamMontaj: 0, toplamDemontaj: 0, toplamDemontajdanMontaj: 0,
                    isUnregisteredItem: false, itemId: null, isFromExcel: false,
                };

                const updated = calculateTotals({
                    ...baseRow,
                    description: node.name,
                    itemId: nodeIdNum,
                    isCategory: false,
                    categoryPercentage: null,
                    isFromExcel: false,
                }, true);

                setEditingBirimFiyatMalzeme(formatInputNumberForDisplay(updated.birimFiyatMalzeme, 2));
                setEditingBirimFiyatMontaj(formatInputNumberForDisplay(updated.birimFiyatMontaj, 2));
                setEditingBirimFiyatDemontaj(formatInputNumberForDisplay(updated.birimFiyatDemontaj, 2));
                setEditingBirimFiyatDemontajMontaj(formatInputNumberForDisplay(updated.birimFiyatDemontajMontaj, 2));
                return updated;
            });
            setIsEditingRowTreeSelectOpen(false);
            setEditingRowTreeSearchTerm('');

            const itemIdForApi = (node.originalData as ApiItemType)?.id;
            if (itemIdForApi) {
                const unitTitle = await fetchItemUnitById(String(itemIdForApi));
                setEditingRowData(prev => {
                    if (!prev) return null;
                    return {
                        ...prev,
                        olcuBrimi: unitTitle || '',
                    };
                });
            } else {
                setEditingRowData(prev => {
                    if (!prev) return null;
                    return { ...prev, olcuBrimi: '' };
                });
            }
        }
    }, [calculateTotals, fetchItemUnitById]);


    const renderSelectValue = useCallback((currentSelectedId: string | null, isEditingContext: boolean, currentTreeSearchTerm: string) => {
        // Use findNodeByIdPure to ensure it doesn't depend on component context
        if (currentSelectedId) {
            const node = findNodeByIdPure(combinedTreeData, currentSelectedId);
            if (node) {
                return node.name;
            }
        }

        if (isEditingContext && editingRowData && editingRowData.description && !currentSelectedId) {
            return editingRowData.description;
        }

        if (!currentSelectedId && currentTreeSearchTerm) {
            return currentTreeSearchTerm;
        }

        if (!isEditingContext && newRecordManualInput) {
            return newRecordManualInput;
        }

        return "Ürün seçin veya manuel girin...";
    }, [combinedTreeData, editingRowData, newRecordManualInput]);


    const handleOpenRegisterModalForUnregisteredRow = useCallback((row: TenderDetailRow) => {
        if (row.isCategory) {
            setCategoryToRegister({
                description: row.description,
                eskiPoz: row.eskiPoz,
                categoryPercentage: row.categoryPercentage,
                isCategory: true,
            });
            setOpenRegisterCategoryModal(true);
        } else {
            setItemToRegister({
                description: row.description,
                olcuBrimi: row.olcuBrimi,
                eskiPoz: row.eskiPoz,
                tedasNo: row.tedasNo,
                anaNo: row.anaNo,
                altNo: row.altNo,
                aciklama: row.aciklama,
                malzeme: row.malzeme,
                malzemeYuklenici: row.malzemeYuklenici,
                montaj: row.montaj,
                demontaj: row.demontaj,
                demontajMontaj: row.demontajMontaj,
                isCategory: false,
            });
            setOpenRegisterItemModal(true);
        }
    }, []);

    
    const handleUpdateRegisteredItemInGrid = useCallback(async (registeredData: ApiItemType | ApiCategoryType) => {
        console.log("--- handleUpdateRegisteredItemInGrid Called ---");
        console.log("gridData length before update:", gridData.length);
        
        // فراخوانی تابع جدید برای رفرش درخت
        await refreshCombinedTreeData();
        
        // ... (بقیه منطق آپدیت محلی gridData) ...
        setGridData(prevGridData => {
            const registeredDataName = 'name' in registeredData ? registeredData.name : '';
            const registeredDataId = 'id' in registeredData ? String(registeredData.id) : null;

            const rowIndex = prevGridData.findIndex(row =>
                row.isUnregisteredItem && 
                normalizeString(row.description) === normalizeString(registeredDataName) &&
                row.isCategory === ('categories' in registeredData)
            );

            if (rowIndex === -1) {
                console.log("--- handleUpdateRegisteredItemInGrid: Row to update not found, returning previous gridData. ---");
                return prevGridData;
            }

            const newGridData = [...prevGridData];
            const rowToUpdate = { ...newGridData[rowIndex] };

            rowToUpdate.isUnregisteredItem = false;
            rowToUpdate.description = registeredDataName;

            if ('categories' in registeredData) {
                rowToUpdate.itemId = null;
                rowToUpdate.isCategory = true;
                if ('percent' in registeredData) {
                    rowToUpdate.categoryPercentage = registeredData.percent as number | null;
                }
            } else {
                rowToUpdate.isCategory = false;
                rowToUpdate.categoryPercentage = null;
                if (registeredDataId !== null) {
                    rowToUpdate.itemId = Number(registeredDataId);
                }
                if ('unit' in registeredData && (registeredData as ApiItemType).unit?.title) {
                    rowToUpdate.olcuBrimi = (registeredData as ApiItemType).unit.title;
                }
            }

            newGridData[rowIndex] = calculateTotals(rowToUpdate, true);

            showAlert(`Liste başarıyla güncellendi و "${registeredDataName}" öğesinin durumu ayarlandı!`, 'success');
            console.log("--- handleUpdateRegisteredItemInGrid: setGridData (Local Update). Old gridData length:", prevGridData.length, "New gridData length:", newGridData.length);
            return newGridData;
        });

    }, [showAlert, navigate, calculateTotals, refreshCombinedTreeData, gridData.length]); // Added gridData.length to dependencies to ensure correct prevGridData access


    const handleRegistrationSuccess = useCallback((registeredData: ApiItemType | ApiCategoryType) => {
        setOpenRegisterItemModal(false);
        setOpenRegisterCategoryModal(false);
        setItemToRegister(null);
        setCategoryToRegister(null);

        // This will now trigger the re-fetch of combinedTreeData and then update gridData locally.
        handleUpdateRegisteredItemInGrid(registeredData);

    }, [handleUpdateRegisteredItemInGrid]);

    const handleCloseRegisterItemModal = useCallback(() => {
        setOpenRegisterItemModal(false);
        setItemToRegister(null);
    }, []);

    const handleCloseRegisterCategoryModal = useCallback(() => {
        setOpenRegisterCategoryModal(false);
        setCategoryToRegister(null);
    }, []);


    const handleAddRecord = async () => {
        let finalDescription = '';
        let finalItemId: number | null = null;
        const selectedNode = newRecordSelectedUnifiedNodeId ? findNodeByIdPure(combinedTreeData, newRecordSelectedUnifiedNodeId) : null;

        if (selectedNode && selectedNode.type === 'item') {
            finalDescription = selectedNode.name;
            finalItemId = (selectedNode.originalData as ApiItemType)?.id ?? null;
        } else if (newRecordManualInput.trim() !== '') {
            finalDescription = newRecordManualInput.trim();
        } else {
            showAlert('Açıklama (MALZEME VEYA İŞİN CİNSİ) alanı boş bırakılamaz. Lütfen bir ürün seçin veya manuel girin.', 'warning');
            return;
        }

        if (isItemDescriptionDuplicate(finalDescription, gridData)) {
            showAlert(`"${finalDescription}" ürünü zaten listede mevcut. Yinelenen kayıt ekleyemezsiniz. Varolan kaydı düzenleyebilirsiniz.`, 'warning');
            return;
        }

        const normalizedFinalDescription = normalizeString(finalDescription);

        const isNewRecordCategory = newRecordRow.olcuBrimi.trim() === '';

        if (newRecordManualInput.trim() !== '' && (!selectedNode || selectedNode.type !== 'item')) {
            if (!isNewRecordCategory) {
                const addedItemId = await addNewItemToApi(finalDescription);
                if (addedItemId !== null) {
                    finalItemId = addedItemId;
                    // After adding, refetch tree data to ensure it's up-to-date for future lookups
                    await fetchDataAndBuildTree();
                } else {
                    return;
                }
            }
        }

        if (finalItemId === null && !isNewRecordCategory && finalDescription !== '') {
            const nodeFromTree = findNodeByNameAndTypePure(combinedTreeData, normalizedFinalDescription, 'item');
            if (nodeFromTree && (nodeFromTree.originalData as ApiItemType)?.id !== undefined) {
                finalItemId = (nodeFromTree.originalData as ApiItemType).id;
            } else {
                if (!newRecordManualInput.trim()) {
                    showAlert('Ürün ID\'si belirlenemedi. Lütfen önce ürünü kaydedin veya listeden seçin.', 'error');
                    return;
                }
            }
        }

        let currentOlcuBrimi = newRecordRow.olcuBrimi;
        if (!isNewRecordCategory && !currentOlcuBrimi && finalItemId !== null) {
            const unitTitle = await fetchItemUnitById(String(finalItemId));
            if (unitTitle) {
                currentOlcuBrimi = unitTitle;
            } else {
                showAlert('Seçilen ürün için ölçü birimi bulunamadı. Lütfen kontrol edin.', 'warning');
            }
        } else if (!isNewRecordCategory && !currentOlcuBrimi && finalDescription && finalItemId === null) {
            showAlert('Ölçü Birimi boş bırakılamaz! Lütfen geçerli bir ürün seçin veya manuel girilen ürün için birim tanımlayın.', 'warning');
            return;
        }


        const newRowId = gridData.length > 0 ? Math.max(...gridData.map(row => row.id)) + 1 : 1;
        const nextSiraNo = getNextAvailableSiraNo(gridData);

        const newRecord: TenderDetailRow = calculateTotals({
            id: newRowId,
            siraNo: nextSiraNo,
            eskiPoz: newRecordRow.eskiPoz,
            tedasNo: newRecordRow.tedasNo,
            anaNo: newRecordRow.anaNo,
            altNo: newRecordRow.altNo,
            description: finalDescription,
            olcuBrimi: currentOlcuBrimi,
            malzeme: newRecordRow.malzeme,
            malzemeYuklenici: newRecordRow.malzemeYuklenici,
            demontaj: newRecordRow.demontaj,
            demontajMontaj: newRecordRow.demontajMontaj,
            birimFiyatMalzeme: newRecordRow.birimFiyatMalzeme,
            birimFiyatMontaj: newRecordRow.birimFiyatMontaj,
            birimFiyatDemontaj: newRecordRow.birimFiyatDemontaj,
            birimFiyatDemontajMontaj: newRecordRow.birimFiyatDemontajMontaj,

            toplamMalzeme: 0,
            toplamMontaj: 0,
            toplamDemontaj: 0,
            toplamDemontajdanMontaj: 0,

            // isUnregisteredItem and itemId should be derived based on the *latest* combinedTreeData
            isUnregisteredItem: !findNodeByNameAndTypePure(combinedTreeData, normalizedFinalDescription, isNewRecordCategory ? 'category' : 'item'),
            itemId: finalItemId,
            aciklama: newRecordRow.aciklama,
            categoryPercentage: isNewRecordCategory ? newRecordRow.categoryPercentage : null,
            isCategory: isNewRecordCategory,
            isFromExcel: false,
        }, true);

        setGridData(prev => [...prev, newRecord]);
        showAlert('Yeni kayıt başarıyla eklendi!', 'success');

        // Reset new record form states
        setNewRecordRow({
            id: 0, siraNo: 0, eskiPoz: '', tedasNo: 0, anaNo: 0, altNo: 0,
            description: '', olcuBrimi: '', malzeme: 0,
            malzemeYuklenici: 0, montaj: 0, demontaj: 0, demontajMontaj: 0,
            birimFiyatMalzeme: 0, birimFiyatMontaj: 0, birimFiyatDemontaj: 0, birimFiyatDemontajMontaj: 0,
            toplamMalzeme: 0, toplamMontaj: 0, toplamDemontaj: 0, toplamDemontajdanMontaj: 0,
            isUnregisteredItem: false, itemId: null, aciklama: '',
            categoryPercentage: null,
            isCategory: false,
            isFromExcel: false,
        });
        setNewRecordSelectedUnifiedNodeId(null);
        setNewRecordManualInput('');
        setNewRecordTreeSearchTerm('');
        setBirimFiyatMalzemeNew("0");
        setBirimFiyatMontajNew("0");
        setBirimFiyatDemontajNew("0");
        setBirimFiyatDemontajMontajNew("0");

        setIsNewRecordTreeSelectOpen(false);
    };

    const handleEditGridRow = useCallback((rowId: number) => {
        const rowToEdit = gridData.find(row => row.id === rowId);
        if (rowToEdit) {
            setEditingRowId(rowId);
            setEditingRowData({ ...rowToEdit });

            setEditingBirimFiyatMalzeme(formatInputNumberForDisplay(rowToEdit.birimFiyatMalzeme, 2));
            setEditingBirimFiyatMontaj(formatInputNumberForDisplay(rowToEdit.birimFiyatMontaj, 2));
            setEditingBirimFiyatDemontaj(formatInputNumberForDisplay(rowToEdit.birimFiyatDemontaj, 2));
            setEditingBirimFiyatDemontajMontaj(formatInputNumberForDisplay(rowToEdit.birimFiyatDemontajMontaj, 2));

            const normalizedDescription = normalizeString(rowToEdit.description);
            let foundNode: UnifiedTreeNode | undefined;

            if (rowToEdit.isCategory) {
                foundNode = findNodeByNameAndTypePure(combinedTreeData, normalizedDescription, 'category');
            } else {
                foundNode = findNodeByNameAndTypePure(combinedTreeData, normalizedDescription, 'item');
            }

            if (foundNode) {
                setEditingRowSelectedUnifiedNodeId(foundNode.id);
                setEditingRowTreeSearchTerm('');
            } else {
                setEditingRowSelectedUnifiedNodeId(null);
                setEditingRowTreeSearchTerm('');
            }
        }
    }, [gridData, combinedTreeData]);


    const handleEditRowInputChange = useCallback((
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
    ) => {
        const target = e.target as HTMLInputElement | HTMLTextAreaElement;
        const { name, value } = target;

        setEditingRowData(prev => {
            if (!prev) return null;

            let updatedData: TenderDetailRow = { ...prev, isFromExcel: false };

            let cleanedValue = value;
            let parsedValue: number;

            if (['birimFiyatMalzeme', 'birimFiyatMontaj', 'birimFiyatDemontaj', 'birimFiyatDemontajMontaj',
                'malzeme', 'categoryPercentage'].includes(name)) {

                const numericValue = value.replace(/,/g, '.');

                if (numericValue.startsWith('.')) {
                    cleanedValue = '0' + numericValue;
                } else {
                    const parts = numericValue.split('.');
                    cleanedValue = parts[0];
                    if (parts.length > 1) {
                        cleanedValue += '.' + parts.slice(1).join('').replace(/[^0-9]/g, '');
                    }
                    cleanedValue = cleanedValue.replace(/[^0-9.]/g, '');
                }

                if (name === 'birimFiyatMalzeme') setEditingBirimFiyatMalzeme(cleanedValue);
                else if (name === 'birimFiyatMontaj') setEditingBirimFiyatMontaj(cleanedValue);
                else if (name === 'birimFiyatDemontaj') setEditingBirimFiyatDemontaj(cleanedValue);
                else if (name === 'birimFiyatDemontajMontaj') setEditingBirimFiyatDemontajMontaj(cleanedValue);

                if (name === 'malzeme') {
                    (updatedData as any)[name] = parseFloat(cleanedValue) || 0;
                } else if (name === 'categoryPercentage') {
                    if (updatedData.isCategory) {
                        (updatedData as any)[name] = parseFloat(cleanedValue) || null;
                    } else {
                        (updatedData as any)[name] = null;
                    }
                } else {
                    parsedValue = parseFloat(cleanedValue) || 0;
                    (updatedData as any)[name] = parsedValue;
                }

            } else if (['malzemeYuklenici', 'demontaj', 'demontajMontaj', 'tedasNo', 'anaNo', 'altNo'].includes(name)) {
                cleanedValue = value.replace(/[^0-9]/g, '');
                (updatedData as any)[name] = parseInt(cleanedValue, 10) || 0;
            } else if (name === 'editingRowDescription') {
                setEditingRowTreeSearchTerm(String(value));
                setEditingRowSelectedUnifiedNodeId(null);
                updatedData.description = String(value);
                // `isCategory` for an edited row needs careful re-evaluation based on its olcuBrimi
                // If olcuBrimi is empty, it's a category.
                updatedData.isCategory = updatedData.olcuBrimi.trim() === '';
                if (!updatedData.isCategory) updatedData.categoryPercentage = null; // Clear percentage for items
            }
            else if (name === 'aciklama') {
                updatedData.aciklama = String(value);
            }
            else if (name === 'eskiPoz') {
                updatedData.eskiPoz = String(value);
            }
            else if (name === 'olcuBrimi') {
                updatedData.olcuBrimi = String(value);
                // `isCategory` is derived from olcuBrimi
                updatedData.isCategory = updatedData.olcuBrimi.trim() === '';
                if (!updatedData.isCategory) updatedData.categoryPercentage = null; // Clear percentage for items
            }

            const tempUpdatedData = calculateTotals(updatedData, true);

            // Re-evaluate isUnregisteredItem after description or olcuBrimi changes
            const foundNode = findNodeByNameAndTypePure(combinedTreeData, normalizeString(tempUpdatedData.description), tempUpdatedData.isCategory ? 'category' : 'item');
            tempUpdatedData.isUnregisteredItem = !foundNode;
            if (!tempUpdatedData.isCategory) { // Only update itemId for items
                tempUpdatedData.itemId = (foundNode?.originalData as ApiItemType)?.id ?? null;
            } else { // Category, so itemId should be null
                tempUpdatedData.itemId = null;
            }

            return tempUpdatedData;
        });
    }, [calculateTotals, combinedTreeData, setEditingBirimFiyatMalzeme, setEditingBirimFiyatMontaj, setEditingBirimFiyatDemontaj, setEditingBirimFiyatDemontajMontaj]);

    const handleUpdateGridRow = async () => {
        if (!editingRowId || !editingRowData) return;

        let updatedRowData: TenderDetailRow = { ...editingRowData };

        const selectedNode = editingRowSelectedUnifiedNodeId ? findNodeByIdPure(combinedTreeData, editingRowSelectedUnifiedNodeId) : null;

        if (selectedNode && selectedNode.type === 'item') {
            updatedRowData.description = selectedNode.name;
            updatedRowData.itemId = (selectedNode.originalData as ApiItemType)?.id ?? null;
            updatedRowData.isCategory = false;
            updatedRowData.categoryPercentage = null;
        }
        else if (editingRowTreeSearchTerm && !editingRowSelectedUnifiedNodeId) {
            updatedRowData.description = editingRowTreeSearchTerm;
            updatedRowData.itemId = null; // If manually typed and not found in tree
        }

        if (!updatedRowData.description) {
            showAlert('Açıklama (MALZEME VEYA İŞİN CİNSİ) alanı boş bırakılamaz!', 'warning');
            return;
        }
        // Re-evaluate isCategory based on olcuBrimi one last time
        updatedRowData.isCategory = updatedRowData.olcuBrimi.trim() === '';
        if (!updatedRowData.isCategory && !updatedRowData.olcuBrimi) {
            showAlert('Ölçü Birimi boş bırakılamaz! Lütfen geçerli bir ürün seçin.', 'warning');
            return;
        }
        if (!updatedRowData.isCategory) updatedRowData.categoryPercentage = null; // Ensure items don't have category percentage

        if (isItemDescriptionDuplicate(updatedRowData.description, gridData, updatedRowData.id)) {
            showAlert(`"${updatedRowData.description}" ürünü zaten listede mevcut. Yinelenen kayıt ekleyemezsiniz. Varolan kaydı düzenleyebilirsiniz.`, 'warning');
            return;
        }

        const normalizedUpdatedDescription = normalizeString(updatedRowData.description);

        let isUnregisteredAfterEdit: boolean;
        if (updatedRowData.isCategory) {
            isUnregisteredAfterEdit = !findNodeByNameAndTypePure(combinedTreeData, normalizedUpdatedDescription, 'category');
            updatedRowData.itemId = null; // Categories don't have item IDs
        } else {
            isUnregisteredAfterEdit = !findNodeByNameAndTypePure(combinedTreeData, normalizedUpdatedDescription, 'item');
            const nodeFromTree = findNodeByNameAndTypePure(combinedTreeData, normalizedUpdatedDescription, 'item');
            updatedRowData.itemId = (nodeFromTree?.originalData as ApiItemType)?.id ?? null; // Update itemId if item is found/registered
        }
        updatedRowData.isUnregisteredItem = isUnregisteredAfterEdit;

        if (!updatedRowData.isCategory && !updatedRowData.olcuBrimi && updatedRowData.itemId !== null) {
            const unitTitle = await fetchItemUnitById(String(updatedRowData.itemId));
            if (unitTitle) {
                updatedRowData = { ...updatedRowData, olcuBrimi: unitTitle };
            } else {
                showAlert('Seçilen ürün için ölçü birimi bulunamadı. Lütfen kontrol edin.', 'warning');
            }
        }

        // Final calculation after all user inputs and selections are processed.
        const finalCalculatedRow = calculateTotals(updatedRowData, true);


        setGridData(prev => prev.map(row =>
            row.id === editingRowId
                ? finalCalculatedRow
                : row
        ));

        setEditingRowId(null);
        setEditingRowData(null);
        setEditingRowSelectedUnifiedNodeId(null);
        setIsEditingRowTreeSelectOpen(false);
        setEditingRowTreeSearchTerm('');
        showAlert('Giriş başarıyla güncellendi!', 'success');
        setEditingBirimFiyatMalzeme('');
        setEditingBirimFiyatMontaj('');
        setEditingBirimFiyatDemontaj('');
        setEditingBirimFiyatDemontajMontaj('');
    };

    const handleCancelEditGridRow = useCallback(() => {
        setEditingRowId(null);
        setEditingRowData(null);
        setEditingRowSelectedUnifiedNodeId(null);
        setIsEditingRowTreeSelectOpen(false);
        setEditingRowTreeSearchTerm('');

        setEditingBirimFiyatMalzeme('');
        setEditingBirimFiyatMontaj('');
        setEditingBirimFiyatDemontaj('');
        setEditingBirimFiyatDemontajMontaj('');
        showAlert('İşlem iptal edildi.', 'info');
    }, [showAlert]);

    const totalMalzemeTutariTl = useMemo(() => {
        return processedAndFilteredGridData.reduce((sum, row) => {
            if (displayMode === 'withoutCategory' && row.isCategory) {
                return sum;
            }
            return sum + (row.toplamMalzeme || 0);
        }, 0);
    }, [processedAndFilteredGridData, displayMode]);

    const totalMontajTutariTl = useMemo(() => {
        return processedAndFilteredGridData.reduce((sum, row) => {
            if (displayMode === 'withoutCategory' && row.isCategory) {
                return sum;
            }
            return sum + (row.toplamMontaj || 0);
        }, 0);
    }, [processedAndFilteredGridData, displayMode]);

    const totalDemontajTutariTl = useMemo(() => {
        return processedAndFilteredGridData.reduce((sum, row) => {
            if (displayMode === 'withoutCategory' && row.isCategory) {
                return sum;
            }
            return sum + (row.toplamDemontaj || 0);
        }, 0);
    }, [processedAndFilteredGridData, displayMode]);

    const totalDmmTutariTl = useMemo(() => {
        return processedAndFilteredGridData.reduce((sum, row) => {
            if (displayMode === 'withoutCategory' && row.isCategory) {
                return sum;
            }
            return sum + (row.toplamDemontajdanMontaj || 0);
        }, 0);
    }, [processedAndFilteredGridData, displayMode]);

    const totalKesifBedeliTl = useMemo(() => {
        return totalMalzemeTutariTl + totalMontajTutariTl + totalDemontajTutariTl + totalDmmTutariTl;
    }, [totalMalzemeTutariTl, totalMontajTutariTl, totalDemontajTutariTl, totalDmmTutariTl]);

    const hasUnregisteredItems = useMemo(() => {
        // Only consider items for this check, not categories (as categories might be "unregistered" from master but part of tender)
        return processedAndFilteredGridData.some(row => row.isUnregisteredItem && !row.isCategory);
    }, [processedAndFilteredGridData]);


    useEffect(() => {
        setCurrentDisplayCount(initialDisplayLimit);
        setHasMoreData(true);

        const handleScroll = () => {
            const { current } = tableContainerRef;
            if (current && hasMoreData &&
                current.scrollTop + current.clientHeight >= current.scrollHeight - 50
            ) {
                setCurrentDisplayCount(prevCount => {
                    const newCount = prevCount + loadMoreStep;
                    if (newCount >= processedAndFilteredGridData.length) {
                        setHasMoreData(false);
                    }
                    return newCount;
                });
            }
        };

        const currentContainer = tableContainerRef.current;
        if (currentContainer) {
            currentContainer.addEventListener('scroll', handleScroll);
        }

        return () => {
            if (currentContainer) {
                currentContainer.removeEventListener('scroll', handleScroll);
            }
        };
    }, [processedAndFilteredGridData, hasMoreData, initialDisplayLimit, loadMoreStep]);


   // ... (Your existing code) ...

const handleSaveAllData = async () => {
    setIsLoading(true);

    const authToken = localStorage.getItem('authToken');
    if (!authToken) {
        showAlert('Oturumunuzun süresi doldu.', 'error');
        navigate("/");
        setIsLoading(false);
        return;
    }
    if (gridData.length === 0) {
        showAlert('Kaydedilecek veri bulunamadı.', 'warning');
        setIsLoading(false);
        return;
    }
    if (editingRowId !== null) {
        showAlert('Lütfen önce açık olan düzenlemeyi tamamlayın veya iptal edin.', 'warning');
        setIsLoading(false);
        return;
    }
    if (processedAndFilteredGridData.some(row => row.isUnregisteredItem && !row.isCategory)) {
        showAlert('Kaydedilmemiş ürünler var. Lütfen tüm ürünleri ekleyin veya listeden seçin.', 'warning');
        setIsLoading(false);
        return;
    }

    setIsSavingAll(true);
    setAlertMessage(null);

    // =======================================================================
    // START: Constructing the Payload for PUT request
    // =======================================================================

    // Group gridData by category for the new API structure
    const groupedData: { [categoryDescription: string]: { categoryInfo: {id: string | null; percent: number | null; description: string; recordStatus: number; createAt: string | null; }, items: TenderDetailRow[] } } = {};
    
    // Iterate through all gridData to build the grouped structure
    gridData.forEach(row => {
        let categoryKey: string = "Uncategorized"; // Default key for items without a clear category in gridData
        let categoryId: string | null = null;
        let categoryPercent: number | null = null;
        let categoryRecordStatus: number = 0; // Default or infer from existing data
        let categoryCreateAt: string | null = null; // Default or infer from existing data


        if (row.isCategory) {
            // For category rows, use their description as the key
            categoryKey = normalizeString(row.description);
            // Try to find the actual category ID from the tree if it exists
            const existingCategoryNode = findNodeByNameAndTypePure(combinedTreeData, categoryKey, 'category');
            categoryId = (existingCategoryNode?.originalData as ApiCategoryType)?.id ?? null;
            categoryPercent = row.categoryPercentage;
            // Assuming createAt and recordStatus for existing categories in the gridData are not relevant for sending back
            // or need to be fetched/handled differently if the backend expects them on a new category post.
        } else {
            // For item rows, find their parent category from combinedTreeData
            if (row.itemId !== null) {
                const itemNode = findNodeByIdPure(combinedTreeData, `item-${row.itemId}`);
                if (itemNode && itemNode.originalData && 'category' in itemNode.originalData && itemNode.originalData.category?.id) {
                    const parentCategoryNode = findNodeByIdPure(combinedTreeData, `cat-${itemNode.originalData.category.id}`);
                    if (parentCategoryNode && parentCategoryNode.type === 'category' && parentCategoryNode.originalData) {
                        categoryKey = normalizeString(parentCategoryNode.name);
                        categoryId = (parentCategoryNode.originalData as ApiCategoryType).id;
                        categoryPercent = (parentCategoryNode.originalData as ApiCategoryType).percent ?? null;
                        categoryRecordStatus = (parentCategoryNode.originalData as ApiCategoryType).recordStatus ?? 0;
                        categoryCreateAt = (parentCategoryNode.originalData as ApiCategoryType).createAt ?? null;
                    }
                }
            }
        }
        
        // Ensure the category entry exists in groupedData
        if (!groupedData[categoryKey]) {
            groupedData[categoryKey] = {
                categoryInfo: {
                    id: categoryId, // Actual category ID from master data
                    percent: categoryPercent,
                    description: categoryKey,
                    recordStatus: categoryRecordStatus,
                    createAt: categoryCreateAt,
                },
                items: []
            };
        }

        // Now push the current row into the items array of its determined category
        // If the current row is itself a category, its details should be empty or handled separately if API expects it
        if (!row.isCategory) { // Only push actual items into 'details' array
             groupedData[categoryKey].items.push(row);
        }
    });

    // Transform grouped data into the API's expected 'categories' array
    const categoriesPayload = Object.values(groupedData).map(group => {
        return {
            id: group.categoryInfo.id, // Use the actual category ID
            percent: group.categoryInfo.percent || 0, // Ensure it's a number, default to 0
            description: group.categoryInfo.description,
            recordStatus: group.categoryInfo.recordStatus, // Include recordStatus
            createAt: group.categoryInfo.createAt,         // Include createAt
            tenderDetails: group.items.map(itemRow => ({
                id: itemRow.id, // Assuming API expects this ID back for existing items (from GET response)
                firmProcuredItemQuantities: itemRow.malzeme, // Values are already numbers
                eskiPoz: itemRow.eskiPoz,
                tedas: String(itemRow.tedasNo), // Convert back to string for API if needed (your API spec was string)
                ana: String(itemRow.anaNo),
                alt: String(itemRow.altNo),
                ourProcuredItemQuantities: itemRow.malzemeYuklenici,
                demontaj: itemRow.demontaj,
                demontajMontaj: itemRow.demontajMontaj,
                firmProcuredItemPrice: itemRow.birimFiyatMalzeme,
                ourProcuredItemPrice: itemRow.birimFiyatMalzeme, 
                montajPrice: itemRow.birimFiyatMontaj,
                demontajPrice: itemRow.birimFiyatDemontaj,
                demontajMontajPrice: itemRow.birimFiyatDemontajMontaj,
                malzemeTutari: itemRow.toplamMalzeme, // Send totals back too if API expects
                montajTutari: itemRow.toplamMontaj,
                demontajTutari: itemRow.toplamDemontaj,
                dMMTutari: itemRow.toplamDemontajdanMontaj,
                recordStatus: 0, // Assuming a default or you have it in TenderDetailRow
                createAt: new Date().toISOString(), // Or from actual row data if available
                item: { // Reconstruct item details for the payload based on current TenderDetailRow state
                    id: itemRow.itemId!, // itemId is guaranteed not null if isUnregisteredItem is false
                    name: itemRow.description,
                    unit: {
                        title: itemRow.olcuBrimi,
                    },
                    // Add other item properties if your API expects them on PUT
                    // e.g., category: { id: itemCategory.id }, code: null, description: itemRow.aciklama, etc.
                    // This part might need more precise mapping based on your backend's PUT DTO for item.
                    category: {
                        id: (findNodeByIdPure(combinedTreeData, `item-${itemRow.itemId}`)?.originalData as ApiItemType)?.category.id || "default-cat-id"
                    }
                }
            }))
        };
    });

    const payload = {
        id: Number(tenderId), // Tender ID from URL params
        // title: tenderTitle, // NOT in your provided new API structure for PUT (in raw response)
        tenderCategories: categoriesPayload, // NEW: Renamed from 'categories' to 'tenderCategories' for consistency with GET
    };
    
    // =======================================================================
    // END: Constructing the Payload for PUT request
    // =======================================================================

    try {
        const response = await axios.put(
            server.baseurl + server.initialoperations + "update-tender",
            payload, // Send the constructed payload
            {
                headers: {
                    "Accept": "application/json",
                    'Content-Type': 'application/json',
                    "Authorization": `Bearer ${authToken}`
                }
            }
        );

        if (response.status === 200) {
            showAlert('İhale detayları başarıyla güncellendi!', 'success');
            // After successful save, you might want to reload the data from API
            // to ensure the UI is fully consistent with the backend, especially if
            // backend makes further changes (e.g., re-calculates totals or assigns new IDs).
            // loadExistingTenderDetails(); // Consider calling this here
        } else {
            showAlert(`Güncelleme başarısız oldu: ${response.data?.message || 'Bilinmeyen bir hata oluştu.'}`, 'error');
        }
    } catch (error: any) {
        if (axios.isAxiosError(error) && error.response && error.response.status === 401) {
            localStorage.removeItem('authToken');
            navigate("/");
            showAlert('Oturumunuzun süresi doldu veya yetkiniz yok. Lütfen tekrar giriş yapın.', 'error');
        }
        console.error("Error updating tender details:", error);
        showAlert(`İhale detayları güncellenirken bir hata oluştu: ${error.response?.data?.message || error.message || 'Sunucuya ulaşılamıyor.'}`, 'error');
    } finally {
        setIsSavingAll(false);
        setIsLoading(false);
    }
};


    const handleDeleteGridRow = useCallback((rowId: number) => {
        setGridData(prev => {
            const updatedGrid = prev.filter(row => row.id !== rowId);
            return updatedGrid;
        });
        showAlert('Giriş başarıyla silindi!', 'success');
        if (editingRowId === rowId) {
            setEditingRowId(null);
            setEditingRowData(null);
            setEditingRowSelectedUnifiedNodeId(null);
            setIsEditingRowTreeSelectOpen(false);
            setEditingRowTreeSearchTerm('');
            setEditingBirimFiyatMalzeme('');
            setEditingBirimFiyatMontaj('');
            setEditingBirimFiyatDemontaj('');
            setEditingBirimFiyatDemontajMontaj('');
        }
    }, [editingRowId, showAlert]);

    const handleExportExcelPreview = useCallback(() => {
        if (!templateWorkbookBuffer) {
            showAlert('Excel şablonu henüz yüklenmedi veya yüklenemedi.', 'warning');
            return;
        }

        const workbook = XLSX.read(templateWorkbookBuffer, { type: 'array', cellStyles: true });
        const sheetName = workbook.SheetNames[0];
        const ws = workbook.Sheets[sheetName];

        const startDataRowIndex = 3;

        const dataRowsForTemplate = gridData.map(row => [
            row.eskiPoz, row.tedasNo, row.anaNo, row.altNo,
            row.description, row.olcuBrimi, row.malzeme, row.malzemeYuklenici,
            row.montaj, row.demontaj, row.demontajMontaj,
            row.birimFiyatMalzeme, row.birimFiyatMontaj, row.birimFiyatDemontaj, row.birimFiyatDemontajMontaj,
            row.aciklama,
            row.isCategory && row.categoryPercentage !== null ? row.categoryPercentage : '', // Only show for categories
            row.toplamMalzeme, row.toplamMontaj, row.toplamDemontaj, row.toplamDemontajdanMontaj
        ]);

        XLSX.utils.sheet_add_aoa(ws, dataRowsForTemplate, { origin: startDataRowIndex, cellStyles: true });

        const startRowForTotals = startDataRowIndex + dataRowsForTemplate.length + 1;

        const totalSumsOutputRows = [
            // Row for ALT TOPLAM:
            [...Array(16).fill(''), 'ALT TOPLAM:', totalMalzemeTutariTl, totalMontajTutariTl, totalDemontajTutariTl, totalDmmTutariTl],
            // Row for TOPLAM KEŞİF BEDELİ TL:
            [...Array(16).fill(''), 'TOPLAM KEŞİF BEDELİ TL:', totalKesifBedeliTl, '', '', '']
        ];
        
        XLSX.utils.sheet_add_aoa(ws, totalSumsOutputRows, { origin: startRowForTotals, cellStyles: true });

        const borderStyle = {
            top: { style: "thin", color: { auto: 1 } },
            bottom: { style: "thin", color: { auto: 1 } },
            left: { style: "thin", color: { auto: 1 } },
            right: { style: "thin", color: { auto: 1 } },
        };

        const totalLabelStyle = {
            font: { bold: true, color: { rgb: "000000" } },
            fill: { fgColor: { rgb: "D9E1F2" } },
            alignment: { horizontal: "right", vertical: "center", wrapText: false },
            border: borderStyle,
        };

        const totalAmountStyle = {
            font: { bold: true, color: { rgb: "000000" } },
            fill: { fgColor: { rgb: "D9E1F2" } },
            alignment: { horizontal: "right", vertical: "center", wrapText: false },
            border: borderStyle,
            numFmt: "#,##0.00"
        };

        for (let R = 0; R < totalSumsOutputRows.length; R++) {
            const currentRowIndexInWorksheet = startRowForTotals + R;
            const currentTotalRowData = totalSumsOutputRows[R];

            for (let C = 0; C < currentTotalRowData.length; C++) {
                const cellAddress = XLSX.utils.encode_cell({ r: currentRowIndexInWorksheet, c: C });
                const cellValue = currentTotalRowData[C];
                let cell = ws[cellAddress];

                if (!cell) { cell = { t: 's', v: cellValue }; ws[cellAddress] = cell; }

                if (C === 16) {
                    Object.assign(cell.s || (cell.s = {}), totalLabelStyle);
                    if (R === 0) {
                        Object.assign(cell.s || (cell.s = {}), { alignment: { horizontal: "center", vertical: "center" } });
                    }
                }
                else if (C >= 17 && C <= 20) {
                    if (typeof cellValue === 'number') {
                        cell.t = 'n';
                        Object.assign(cell.s || (cell.s = {}), totalAmountStyle);
                    } else {
                        Object.assign(cell.s || (cell.s = {}), totalLabelStyle);
                    }
                }
                else {
                    Object.assign(cell.s || (cell.s = {}), totalLabelStyle);
                }
            }
        }

        const specificMerges = [
            { s: { r: 0, c: 0 }, e: { r: 2, c: 0 } }, // ESKİ POZ (A1:A3)
            { s: { r: 0, c: 4 }, e: { r: 2, c: 4 } }, // MALZEME VEYA İŞİN CİNSİ (E1:E3)
            { s: { r: 0, c: 5 }, e: { r: 2, c: 5 } }, // ÖLÇÜ (F1:F3)
            { s: { r: 0, c: 15 }, e: { r: 2, c: 15 } }, // AÇIKLAMA (P1:P3)
            { s: { r: 0, c: 16 }, e: { r: 2, c: 16 } }, // %Kategoriler (Q1:Q3)

            { s: { r: 1, c: 1 }, e: { r: 1, c: 3 } }, // YENİ POZ NO (B2:D2)
            { s: { r: 1, c: 6 }, e: { r: 1, c: 10 } }, // MİKTAR (G2:K2)
            { s: { r: 1, c: 11 }, e: { r: 1, c: 14 } }, // Birim fiyatlar (L2:O2)
            { s: { r: 1, c: 17 }, e: { r: 1, c: 20 } }, // TUTARLAR (R2:U2)

            { s: { r: startRowForTotals, c: 16 }, e: { r: startRowForTotals, c: 17 } },
            { s: { r: startRowForTotals + 1, c: 16 }, e: { r: startRowForTotals + 1, c: 17 } },
        ];

        ws['!merges'] = (ws['!merges'] || []).concat(specificMerges); // Append merges

        const colWidths = [
            { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 30 }, { wch: 10 },
            { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 },
            { wch: 15 }, { wch: 15 }, { wch: 20 }, { wch: 25 },
            { wch: 40 },
            { wch: 15 },
            { wch: 20 },
            { wch: 20 },
            { wch: 20 },
            { wch: 20 }
        ];
        ws['!cols'] = colWidths;


        XLSX.writeFile(workbook, `İhaleDetayları_${tenderId}_${new Date().toLocaleDateString('tr-TR')}.xlsx`);
        showAlert('Excel önizlemesi başarıyla oluşturuldu!', 'success');
    }, [templateWorkbookBuffer, gridData, totalMalzemeTutariTl, totalMontajTutariTl, totalDemontajTutariTl, totalDmmTutariTl, totalKesifBedeliTl, tenderId, showAlert]);

    interface CombinedTreeMenuItemProps {
        node: UnifiedTreeNode;
        selectedId: string | null;
        onSelect: (node: UnifiedTreeNode) => void;
        isSearchActive: boolean;
        isNodeAncestorOfSpecificSelectedId: (nodeId: string, specificSelectedId: string | null) => boolean;
    }

    const CombinedTreeMenuItem: React.FC<CombinedTreeMenuItemProps> = ({ node, selectedId, onSelect, isSearchActive, isNodeAncestorOfSpecificSelectedId }) => {
        const [open, setOpen] = useState(isSearchActive || node.type === 'item' || isNodeAncestorOfSpecificSelectedId(node.id, selectedId));

        useEffect(() => {
            setOpen(isSearchActive || node.type === 'item' || isNodeAncestorOfSpecificSelectedId(node.id, selectedId));
        }, [isSearchActive, node.type, isNodeAncestorOfSpecificSelectedId, node.id, selectedId]);

        const handleToggleCollapse = (e: React.MouseEvent) => {
            e.stopPropagation();
            setOpen(!open);
        };

        const handleSelection = (e: React.MouseEvent | React.ChangeEvent) => {
            e.stopPropagation();
            if (node.type === 'item') { // Only items are selectable
                onSelect(node);
            } else if (node.type === 'category' && node.children && node.children.length > 0) {
                // Allow clicking on categories to expand/collapse if they have children
                setOpen(!open);
            }
        };

        return (
            <>
                <MuiMenuItem
                    onClick={handleSelection}
                    sx={{
                        paddingLeft: `${node.depth * 20 + 8}px`,
                        fontWeight: node.type === 'category' ? 'bold' : 'normal',
                        backgroundColor: selectedId === node.id ? 'rgba(0, 0, 0, 0.08)' : 'transparent',
                        '&:hover': {
                            backgroundColor: selectedId === node.id ? 'rgba(0, 0, 0, 0.12)' : 'rgba(0, 0, 0, 0.04)',
                        },
                        opacity: node.type === 'category' && node.children.length === 0 ? 0.6 : 1,
                        // If category has no children, it's not selectable, so disable pointer events.
                        // If it has children, allow it to be clickable to expand/collapse.
                        pointerEvents: node.type === 'category' && node.children.length === 0 ? 'none' : 'auto',
                    }}
                    disabled={node.type === 'category' && node.children.length === 0} // Disable if it's a category without children
                >
                    <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', gap: 1 }}>
                        {node.children && node.children.length > 0 && node.type === 'category' ? (
                            <IconButton onClick={handleToggleCollapse} size="small" sx={{ p: 0.5 }}>
                                {open ? <IconChevronDown size={16} /> : <IconChevronRight size={16} />}
                            </IconButton>
                        ) : (
                            <Box sx={{ width: 28 }} />
                        )}

                        {node.type === 'item' && (
                            <Checkbox
                                edge="start"
                                size="small"
                                checked={selectedId === node.id}
                                onChange={handleSelection} // Handle selection via checkbox too
                                sx={{ p: 0 }}
                                tabIndex={-1}
                                disableRipple
                            />
                        )}
                        <ListItemText primary={node.name} primaryTypographyProps={{ variant: 'body2', noWrap: true }} />
                    </Box>
                </MuiMenuItem>
                {open && node.children && (
                    <List component="div" disablePadding>
                        {node.children.map(childNode => (
                            <CombinedTreeMenuItem
                                key={childNode.id}
                                node={childNode}
                                selectedId={selectedId}
                                onSelect={onSelect}
                                isSearchActive={isSearchActive}
                                isNodeAncestorOfSpecificSelectedId={isNodeAncestorOfSpecificSelectedId}
                            />
                        ))}
                    </List>
                )}
            </>
        );
    };

    return (
        <Box sx={{ p: 3 }} >
            <Typography variant="h4" gutterBottom>
                <span style={{ color: theme.palette.primary.main }}>{tenderTitle}</span>
            </Typography>
            <Typography variant="h6" color="textSecondary" gutterBottom>
                İhale Detayları ({tenderId})
            </Typography>

            <Paper elevation={3} sx={{ p: 2, mb: 3 }}>
                <Grid container spacing={2} alignItems="center">
                    <Grid item xs={12} sm={6}>
                        <Typography variant="h6" gutterBottom>Excel Dosyası Yükle</Typography>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".xlsx, .xls, .csv"
                            onChange={handleFileUpload}
                            style={{ display: 'none' }}
                        />
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <CustomTooltip title={isTooltipGloballyEnabled ? "Excel dosyasını (.xlsx, .xls veya .csv) yükle" : ""}>
                                <Button
                                    variant="contained"
                                    component="label"
                                    onClick={() => fileInputRef.current?.click()}
                                    startIcon={<IconCloudUpload />}
                                    sx={{ mt: 1, mb: 1 }}
                                    disabled={loading || isSavingAll || editingRowId !== null || isLoading}
                                >
                                    {loading ? 'Dosya Okunuyor...' : 'Dosya Seç'}
                                </Button>
                            </CustomTooltip>
                            <CustomTooltip title={isTooltipGloballyEnabled ? "Boş Excel şablonunu indir" : ""}>
                                <Button
                                    variant="outlined"
                                    color="secondary"
                                    href="/tender_template.xlsx"
                                    download="ihale_sablonu.xlsx"
                                    startIcon={<IconDownload />}
                                    sx={{ mt: 1, mb: 1 }}
                                    disabled={loading || isSavingAll || editingRowId !== null || isLoading}
                                >
                                    Şablon İndir
                                </Button>
                            </CustomTooltip>
                            {fileUploadedSuccessfully && !loading && (
                                <CustomTooltip title="Dosya başarıyla yüklendi!">
                                    <IconCheck style={{ color: theme.palette.success.main }} />
                                </CustomTooltip>
                            )}
                            {loading && (
                                <Box sx={{ width: '100px', ml: 2 }}>
                                    <CircularProgress size={20} />
                                </Box>
                            )}
                        </Box>
                        <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
                            Lütfen Excel dosyanızı (.xlsx, .xls veya .csv) buraya yükleyin.
                        </Typography>
                    </Grid>
                    <Grid item xs={12} sm={6} sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'flex-end', gap: 1 }}>
                        <Button
                            variant="contained"
                            color="primary"
                            onClick={handleSaveAllData}
                            disabled={isLoading || isSavingAll || editingRowId !== null || gridData.length === 0 || hasUnregisteredItems}
                            startIcon={isSavingAll ? <CircularProgress size={20} color="inherit" /> : <IconCheck />}
                            sx={{ minWidth: 150, height: 40 }}
                        >
                            {isSavingAll ? 'Kaydediliyor...' : 'Tümünü Kaydet'}
                        </Button>
                        <CustomTooltip title={isTooltipGloballyEnabled ? "Tabloyu Excel olarak dışa aktar" : ""}>
                            <Button
                                variant="outlined"
                                color="secondary"
                                onClick={handleExportExcelPreview}
                                disabled={isLoading || isSavingAll || editingRowId !== null || gridData.length === 0}
                                startIcon={<IconFileExport />}
                                sx={{ minWidth: 150, height: 40 }}
                            >
                                Excel Önizlemesi Oluştur
                            </Button>
                        </CustomTooltip>
                    </Grid>
                </Grid>
            </Paper>

            <Paper elevation={3} sx={{ p: 2, mb: 3 }}>
                <Grid container spacing={2} alignItems="center">
                    <Grid item xs={12} sm={6}>
                        <Typography variant="h6" gutterBottom>Tablo İçinde Ara</Typography>
                        <TextField
                            fullWidth
                            size="small"
                            placeholder="MALZEME VEYA İŞİN CİNSİ veya Açıklama içinde ara..."
                            value={gridSearchTerm}
                            onChange={(e) => setGridSearchTerm(e.target.value)}
                            InputProps={{
                                startAdornment: (<InputAdornment position="start"><IconSearch size={18} /></InputAdornment>),
                            }}
                        />
                    </Grid>
                    <Grid item xs={12} sm={6} sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'flex-end' }}>
                        <Stack direction="row" spacing={1}>
                            <Button
                                variant={displayMode === 'withoutCategory' ? 'contained' : 'outlined'}
                                onClick={() => setDisplayMode('withoutCategory')}
                                disabled={isLoading || isSavingAll || editingRowId !== null}
                                size="small"
                            >
                                Kategorisiz Görüntüle
                            </Button>
                            <Button
                                variant={displayMode === 'withCategory' ? 'contained' : 'outlined'}
                                onClick={() => setDisplayMode('withCategory')}
                                disabled={isLoading || isSavingAll || editingRowId !== null}
                                size="small"
                            >
                                Kategorilerle Görüntüle
                            </Button>
                        </Stack>
                    </Grid>
                </Grid>
            </Paper>
            {alertMessage && (
                <Stack sx={{ width: '100%', mb: 2 }} spacing={2}>
                    <Alert severity={alertSeverity} onClose={clearAlert}>
                        {alertMessage}
                    </Alert>
                </Stack>
            )}

            <BlankCard>
                <Box sx={{ overflowX: 'auto', width: '100%' }}>
                    <TableContainer ref={tableContainerRef} sx={{ maxHeight: 600 }}>
                        <Table stickyHeader aria-label="tender details table" sx={{ minWidth: 2100 }}>
                            <TableHead>
                                <TableRow>
                                    <TableCell sx={{ backgroundColor: theme.palette.background.paper, minWidth: 80, borderRight: '1px solid ' + theme.palette.divider }}>
                                        <Typography variant="subtitle2" fontWeight="600">ESKİ POZ</Typography>
                                    </TableCell>
                                    <TableCell colSpan={3} align="center" sx={{ borderBottom: 'none', borderRight: '1px solid ' + theme.palette.divider, minWidth: 180 }}>
                                        <Typography variant="subtitle2" fontWeight="600">YENİ POZ NO</Typography>
                                    </TableCell>
                                    <TableCell sx={{ backgroundColor: theme.palette.background.paper, minWidth: 280, borderRight: '1px solid ' + theme.palette.divider }}>
                                        <Typography variant="subtitle2" fontWeight="600">MALZEME VEYA İŞİN CİNSİ</Typography>
                                    </TableCell>
                                    <TableCell sx={{ minWidth: 100, borderRight: '1px solid ' + theme.palette.divider }}>
                                        <Typography variant="subtitle2" fontWeight="600">ÖLÇÜ</Typography>
                                    </TableCell>
                                    <TableCell colSpan={5} align="center" sx={{ borderBottom: 'none', borderRight: '1px solid ' + theme.palette.divider, minWidth: 500 }}>
                                        <Typography variant="subtitle2" fontWeight="600">MİKTAR</Typography>
                                    </TableCell>
                                    <TableCell colSpan={4} align="center" sx={{ borderBottom: 'none', borderRight: '1px solid ' + theme.palette.divider, minWidth: 400 }}>
                                        <Typography variant="subtitle2" fontWeight="600">Birim fiyatlar</Typography>
                                    </TableCell>
                                    <TableCell rowSpan={2} sx={{ minWidth: 200, zIndex: 4, backgroundColor: theme.palette.background.paper, borderRight: '1px solid ' + theme.palette.divider }}>
                                        <Typography variant="subtitle2" fontWeight="600">AÇIKLAMA</Typography>
                                    </TableCell>
                                    <TableCell rowSpan={2} sx={{ minWidth: 100, zIndex: 4, backgroundColor: theme.palette.background.paper, borderRight: '1px solid ' + theme.palette.divider }}>
                                        <Typography variant="subtitle2" fontWeight="600">%Kategoriler</Typography>
                                    </TableCell>
                                    <TableCell colSpan={4} align="center" sx={{ borderBottom: 'none' }}>
                                        <Typography variant="subtitle2" fontWeight="600">TUTARLAR</Typography>
                                    </TableCell>
                                    <TableCell rowSpan={2} sx={{ minWidth: 120, zIndex: 4, backgroundColor: theme.palette.background.paper }}>
                                        <Typography variant="subtitle2" fontWeight="600">Aksiyonlar</Typography>
                                    </TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell sx={{ backgroundColor: theme.palette.background.paper, borderTop: '1px solid ' + theme.palette.divider, borderBottom: '1px solid ' + theme.palette.divider, borderRight: '1px solid ' + theme.palette.divider }}></TableCell>
                                    <TableCell align="center" sx={{ minWidth: 60 }}>TEDAŞ</TableCell>
                                    <TableCell align="center" sx={{ minWidth: 60 }}>ANA</TableCell>
                                    <TableCell align="center" sx={{ borderRight: '1px solid ' + theme.palette.divider, minWidth: 60 }}>ALT</TableCell>

                                    <TableCell sx={{ backgroundColor: theme.palette.background.paper, borderTop: '1px solid ' + theme.palette.divider, borderBottom: '1px solid ' + theme.palette.divider, borderRight: '1px solid ' + theme.palette.divider }}></TableCell>
                                    <TableCell sx={{ borderRight: '1px solid ' + theme.palette.divider }}></TableCell>

                                    <TableCell align="center" sx={{ minWidth: 100 }}>MALZEME</TableCell>
                                    <TableCell align="center" sx={{ minWidth: 100 }}>MALZEME MİKTARI</TableCell>
                                    <TableCell align="center" sx={{ minWidth: 100 }}>MONTAJ MİKTARI</TableCell>
                                    <TableCell align="center" sx={{ minWidth: 100 }}>DEMONTAJ MİKTARI</TableCell>
                                    <TableCell align="center" sx={{ borderRight: '1px solid ' + theme.palette.divider, minWidth: 100 }}>DMM MİKTARI</TableCell>

                                    <TableCell align="center" sx={{ minWidth: 100 }}>MALZEME (TL)</TableCell>
                                    <TableCell align="center" sx={{ minWidth: 100 }}>MONTAJ (TL)</TableCell>
                                    <TableCell align="center" sx={{ minWidth: 100 }}>DEMONTAJ (SÖKME) (TL)</TableCell>
                                    <TableCell align="center" sx={{ borderRight: '1px solid ' + theme.palette.divider, minWidth: 100 }}>DEMONTAJDAN MONTAJ (TL)</TableCell>

                                    <TableCell align="center" sx={{ minWidth: 100 }}>MALZEME TUTARI-TL</TableCell>
                                    <TableCell align="center" sx={{ minWidth: 100 }}>MONTAJ TUTARI-TL</TableCell>
                                    <TableCell align="center" sx={{ minWidth: 100 }}>DEMONTAJ TUTARI-TL</TableCell>
                                    <TableCell align="center" sx={{ minWidth: 100 }}>DMM TUTARI-TL</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {/* New Record Row (fixed top row) */}
                                <TableRow sx={{ position: 'sticky', top: 75, zIndex: 3, backgroundColor: theme.palette.background.paper, boxShadow: '0px 2px 4px -1px rgba(0,0,0,0.2), 0px 4px 5px 0px rgba(0,0,0,0.14), 0px 1px 10px 0px rgba(0,0,0,0.12)' }}>
                                    <TableCell sx={{ backgroundColor: theme.palette.background.paper, borderRight: '1px solid ' + theme.palette.divider }}>
                                        <CustomTextField
                                            id="new-eskiPoz"
                                            name="eskiPoz"
                                            type="text"
                                            size="small"
                                            value={newRecordRow.eskiPoz}
                                            onChange={handleNewRecordInputChange}
                                            sx={{ width: 60, '& input': { textAlign: 'center' } }}
                                            placeholder="POZ NO"
                                            disabled={loading || isSavingAll || isLoading}
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <CustomTextField
                                            id="new-tedasNo"
                                            name="tedasNo"
                                            type="text"
                                            size="small"
                                            value={formatInputNumberForDisplay(newRecordRow.tedasNo, 0)}
                                            onChange={handleNewRecordInputChange}
                                            sx={{ width: 60, '& input': { textAlign: 'center' } }}
                                            disabled={loading || isSavingAll || isLoading}
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <CustomTextField
                                            id="new-anaNo"
                                            name="anaNo"
                                            type="text"
                                            size="small"
                                            value={formatInputNumberForDisplay(newRecordRow.anaNo, 0)}
                                            onChange={handleNewRecordInputChange}
                                            sx={{ width: 60, '& input': { textAlign: 'center' } }}
                                            disabled={loading || isSavingAll || isLoading}
                                        />
                                    </TableCell>
                                    <TableCell sx={{ borderRight: '1px solid ' + theme.palette.divider }}>
                                        <CustomTextField
                                            id="new-altNo"
                                            name="altNo"
                                            type="text"
                                            size="small"
                                            value={formatInputNumberForDisplay(newRecordRow.altNo, 0)}
                                            onChange={handleNewRecordInputChange}
                                            sx={{ width: 60, '& input': { textAlign: 'center' } }}
                                            disabled={loading || isSavingAll || isLoading}
                                        />
                                    </TableCell>

                                    <TableCell sx={{ backgroundColor: 'inherit', borderRight: '1px solid ' + theme.palette.divider }}>
                                        <FormControl fullWidth size="small" variant="outlined">
                                            <Select
                                                displayEmpty
                                                value={newRecordSelectedUnifiedNodeId || newRecordManualInput || ''}
                                                open={isNewRecordTreeSelectOpen}
                                                onOpen={() => {
                                                    setIsNewRecordTreeSelectOpen(true);
                                                }}
                                                onClose={() => {
                                                    setIsNewRecordTreeSelectOpen(false);
                                                }}
                                                onChange={() => { /* handled by CombinedTreeMenuItem's onSelect */ }}
                                                renderValue={(selected) => renderSelectValue(selected as string, false, newRecordTreeSearchTerm)}
                                                MenuProps={{
                                                    PaperProps: { style: { maxHeight: 400, width: 450 } },
                                                }}
                                                disabled={loading || isSavingAll || isLoading}
                                            >
                                                <Box sx={{ p: 1, borderBottom: 1, borderColor: 'divider' }}>
                                                    <TextField
                                                        fullWidth
                                                        autoFocus
                                                        size="small"
                                                        placeholder="Ürün ara veya manuel girin..."
                                                        value={newRecordTreeSearchTerm}
                                                        onChange={(e) => setNewRecordTreeSearchTerm(e.target.value)}
                                                        onClick={(e) => e.stopPropagation()}
                                                        onKeyDown={(e) => e.stopPropagation()}
                                                        InputProps={{
                                                            startAdornment: (<InputAdornment position="start"><IconSearch size={18} /></InputAdornment>),
                                                        }}
                                                    />
                                                </Box>

                                                {loadingTree ? (
                                                    <MuiMenuItem disabled><CircularProgress size={20} sx={{ mr: 1 }} /> Yükleniyor...</MuiMenuItem>
                                                ) : (
                                                    <List component="div" disablePadding>
                                                        {filteredTreeForNewRecordDisplay.map((node) => (
                                                            <CombinedTreeMenuItem
                                                                key={node.id}
                                                                node={node}
                                                                selectedId={newRecordSelectedUnifiedNodeId}
                                                                onSelect={handleNewRecordTreeSelection}
                                                                isSearchActive={!!newRecordTreeSearchTerm}
                                                                isNodeAncestorOfSpecificSelectedId={isNodeAncestorOfNewRecordSelected}
                                                            />
                                                        ))}
                                                        {newRecordTreeSearchTerm && !newRecordSelectedUnifiedNodeId && (
                                                            <MuiMenuItem onClick={() => {
                                                                setNewRecordManualInput(newRecordTreeSearchTerm);
                                                                setNewRecordRow(prev => calculateTotals({ ...prev, description: newRecordTreeSearchTerm, isCategory: (prev.olcuBrimi.trim() === '') }, true));
                                                                setNewRecordSelectedUnifiedNodeId(null);
                                                                setIsNewRecordTreeSelectOpen(false);
                                                            }}>
                                                                <ListItemText primary={`"${newRecordTreeSearchTerm}" olarak manuel ekle`} />
                                                            </MuiMenuItem>
                                                        )}
                                                    </List>
                                                )}
                                            </Select>
                                        </FormControl>
                                    </TableCell>
                                    <TableCell sx={{ borderRight: '1px solid ' + theme.palette.divider }}>
                                        <CustomTextField
                                            id="new-olcuBrimi"
                                            name="olcuBrimi"
                                            type="text"
                                            size="small"
                                            value={newRecordRow.olcuBrimi || ''}
                                            disabled={true}
                                            sx={{ width: 90, '& input': { textAlign: 'center' } }}
                                            placeholder="Ölçü"
                                        />
                                    </TableCell>
                                    {/* NEW: MALZEME (new input field) */}
                                    <TableCell>
                                        <CustomTextField
                                            id="new-malzeme"
                                            name="malzeme"
                                            type="text"
                                            size="small"
                                            value={formatInputNumberForDisplay(newRecordRow.malzeme, 0)}
                                            onChange={handleNewRecordInputChange}
                                            sx={{ width: 70, '& input': { textAlign: 'center' } }}
                                            disabled={loading || isSavingAll || isLoading}
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <CustomTextField
                                            id="new-malzemeYuklenici"
                                            name="malzemeYuklenici"
                                            type="text"
                                            size="small"
                                            value={formatInputNumberForDisplay(newRecordRow.malzemeYuklenici, 0)}
                                            onChange={handleNewRecordInputChange}
                                            sx={{ width: 70, '& input': { textAlign: 'center' } }}
                                            disabled={loading || isSavingAll || isLoading}
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <CustomTextField
                                            id="new-montaj"
                                            name="montaj"
                                            type="text"
                                            size="small"
                                            value={formatInputNumberForDisplay(newRecordRow.montaj, 0)}
                                            sx={{ width: 70, '& input': { textAlign: 'center' } }}
                                            disabled={true} // MONTAJ MİKTARI is read-only
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <CustomTextField
                                            id="new-demontaj"
                                            name="demontaj"
                                            type="text"
                                            size="small"
                                            value={formatInputNumberForDisplay(newRecordRow.demontaj, 0)}
                                            onChange={handleNewRecordInputChange}
                                            sx={{ width: 70, '& input': { textAlign: 'center' } }}
                                            disabled={loading || isSavingAll || isLoading}
                                        />
                                    </TableCell>
                                    <TableCell sx={{ borderRight: '1px solid ' + theme.palette.divider }}>
                                        <CustomTextField
                                            id="new-demontajMontaj"
                                            name="demontajMontaj"
                                            type="text"
                                            size="small"
                                            value={formatInputNumberForDisplay(newRecordRow.demontajMontaj, 0)}
                                            onChange={handleNewRecordInputChange}
                                            sx={{ width: 70, '& input': { textAlign: 'center' } }}
                                            disabled={loading || isSavingAll || isLoading}
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <CustomTextField
                                            id="new-birimFiyatMalzeme"
                                            name="birimFiyatMalzeme"
                                            type="text"
                                            size="small"
                                            value={birimFiyatMalzemeNew}
                                            onChange={handleNewRecordInputChange}
                                            sx={{ width: 70, '& input': { textAlign: 'center' } }}
                                            disabled={loading || isSavingAll || isLoading}
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <CustomTextField
                                            id="new-birimFiyatMontaj"
                                            name="birimFiyatMontaj"
                                            type="text"
                                            size="small"
                                            value={birimFiyatMontajNew}
                                            onChange={handleNewRecordInputChange}
                                            sx={{ width: 70, '& input': { textAlign: 'center' } }}
                                            disabled={loading || isSavingAll || isLoading}
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <CustomTextField
                                            id="new-birimFiyatDemontaj"
                                            name="birimFiyatDemontaj"
                                            type="text"
                                            size="small"
                                            value={birimFiyatDemontajNew}
                                            onChange={handleNewRecordInputChange}
                                            sx={{ width: 70, '& input': { textAlign: 'center' } }}
                                            disabled={loading || isSavingAll || isLoading}
                                        />
                                    </TableCell>
                                    <TableCell sx={{ borderRight: '1px solid ' + theme.palette.divider }}>
                                        <CustomTextField
                                            id="new-birimFiyatDemontajMontaj"
                                            name="birimFiyatDemontajMontaj"
                                            type="text"
                                            size="small"
                                            value={birimFiyatDemontajMontajNew}
                                            onChange={handleNewRecordInputChange}
                                            sx={{ width: 70, '& input': { textAlign: 'center' } }}
                                            disabled={loading || isSavingAll || isLoading}
                                        />
                                    </TableCell>
                                    <TableCell sx={{ borderRight: '1px solid ' + theme.palette.divider }}>
                                        <CustomTextField
                                            id="new-aciklama"
                                            name="aciklama"
                                            multiline
                                            rows={2}
                                            size="small"
                                            value={newRecordRow.aciklama}
                                            onChange={handleNewRecordInputChange}
                                            sx={{ width: 180 }}
                                            disabled={loading || isSavingAll || isLoading}
                                            placeholder="Açıklama girin..."
                                        />
                                    </TableCell>
                                    {/* NEW: %Kategoriler - only editable for categories */}
                                    <TableCell sx={{ borderRight: '1px solid ' + theme.palette.divider }}>
                                        <CustomTextField
                                            id="new-categoryPercentage"
                                            name="categoryPercentage"
                                            type="text"
                                            size="small"
                                            value={newRecordRow.isCategory ? formatInputNumberForDisplay(newRecordRow.categoryPercentage, 2) : ''}
                                            onChange={handleNewRecordInputChange}
                                            sx={{ width: 90, '& input': { textAlign: 'center' } }}
                                            disabled={!newRecordRow.isCategory || loading || isSavingAll || isLoading}
                                            placeholder={newRecordRow.isCategory ? "%n" : "N/A"}
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <CustomTextField
                                            id="new-toplamMalzeme"
                                            name="toplamMalzeme"
                                            type="text"
                                            size="small"
                                            value={formatNumber(newRecordRow.toplamMalzeme, 2)}
                                            sx={{ width: 90, '& input': { textAlign: 'center' } }}
                                            disabled={true} // TUTARLAR is read-only
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <CustomTextField
                                            id="new-toplamMontaj"
                                            name="toplamMontaj"
                                            type="text"
                                            size="small"
                                            value={formatNumber(newRecordRow.toplamMontaj, 2)}
                                            sx={{ width: 90, '& input': { textAlign: 'center' } }}
                                            disabled={true} // TUTARLAR is read-only
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <CustomTextField
                                            id="new-toplamDemontaj"
                                            name="toplamDemontaj"
                                            type="text"
                                            size="small"
                                            value={formatNumber(newRecordRow.toplamDemontaj, 2)}
                                            sx={{ width: 90, '& input': { textAlign: 'center' } }}
                                            disabled={true} // TUTARLAR is read-only
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <CustomTextField
                                            id="new-toplamDemontajdanMontaj"
                                            name="toplamDemontajdanMontaj"
                                            type="text"
                                            size="small"
                                            value={formatNumber(newRecordRow.toplamDemontajdanMontaj, 2)}
                                            sx={{ width: 90, '& input': { textAlign: 'center' } }}
                                            disabled={true} // TUTARLAR is read-only
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <Stack direction="row" spacing={0.5}>
                                            <CustomTooltip title={isTooltipGloballyEnabled ? "Yeni giriş ekle" : ""}>
                                                <IconButton size="small" color="success" onClick={handleAddRecord}
                                                    disabled={loading || isSavingAll || isLoading}
                                                >
                                                    <IconPlus size={20} />
                                                </IconButton>
                                            </CustomTooltip>
                                        </Stack>
                                    </TableCell>
                                </TableRow>

                                {/* Existing Data Rows */}
                                {displayedGridData.length > 0 ? (
                                    displayedGridData.map((row) => (
                                        <TableRow key={row.id}>
                                            <TableCell sx={{ backgroundColor: theme.palette.background.paper, borderRight: '1px solid ' + theme.palette.divider, fontWeight: 'normal', paddingLeft: '16px', textAlign: 'center' }}>
                                                {editingRowId === row.id ? (
                                                    <CustomTextField
                                                        id={`eskiPoz-${row.id}`}
                                                        name="eskiPoz"
                                                        type="text"
                                                        size="small"
                                                        value={editingRowData?.eskiPoz ?? ''}
                                                        onChange={handleEditRowInputChange}
                                                        sx={{ width: 60, '& input': { textAlign: 'center' } }}
                                                        placeholder="POZ NO"
                                                        disabled={loading || isSavingAll || isLoading}
                                                    />
                                                ) : (
                                                    row.eskiPoz
                                                )}
                                            </TableCell>
                                            <TableCell sx={{ textAlign: 'center' }}>
                                                {editingRowId === row.id ? (
                                                    <CustomTextField
                                                        id={`tedasNo-${row.id}`}
                                                        name="tedasNo"
                                                        type="text"
                                                        size="small"
                                                        value={formatInputNumberForDisplay(editingRowData?.tedasNo ?? null, 0)}
                                                        onChange={handleEditRowInputChange}
                                                        sx={{ width: 60, '& input': { textAlign: 'center' } }}
                                                        disabled={loading || isSavingAll || isLoading}
                                                    />
                                                ) : (
                                                    formatIntForDisplayNoGrouping(row.tedasNo)
                                                )}
                                            </TableCell>
                                            <TableCell sx={{ textAlign: 'center' }}>
                                                {editingRowId === row.id ? (
                                                    <CustomTextField
                                                        id={`anaNo-${row.id}`}
                                                        name="anaNo"
                                                        type="text"
                                                        size="small"
                                                        value={formatInputNumberForDisplay(editingRowData?.anaNo ?? null, 0)}
                                                        onChange={handleEditRowInputChange}
                                                        sx={{ width: 60, '& input': { textAlign: 'center' } }}
                                                        disabled={loading || isSavingAll || isLoading}
                                                    />
                                                ) : (
                                                    formatIntForDisplayNoGrouping(row.anaNo)
                                                )}
                                            </TableCell>
                                            <TableCell sx={{ borderRight: '1px solid ' + theme.palette.divider, textAlign: 'center' }}>
                                                {editingRowId === row.id ? (
                                                    <CustomTextField
                                                        id={`altNo-${row.id}`}
                                                        name="altNo"
                                                        type="text"
                                                        size="small"
                                                        value={formatInputNumberForDisplay(editingRowData?.altNo ?? null, 0)}
                                                        onChange={handleEditRowInputChange}
                                                        sx={{ width: 60, '& input': { textAlign: 'center' } }}
                                                        disabled={loading || isSavingAll || isLoading}
                                                    />
                                                ) : (
                                                    formatIntForDisplayNoGrouping(row.altNo)
                                                )}
                                            </TableCell>

                                            <TableCell sx={{ backgroundColor: theme.palette.background.paper, borderRight: '1px solid ' + theme.palette.divider, fontWeight: 'normal', paddingLeft: '16px', border: (row.isUnregisteredItem ?? false) ? '1px solid ' + theme.palette.error.main : 'none' }}>
                                                {editingRowId === row.id ? (
                                                    <FormControl fullWidth size="small" variant="outlined">
                                                        <Select
                                                            displayEmpty
                                                            value={editingRowSelectedUnifiedNodeId || editingRowData?.description || ''}
                                                            open={isEditingRowTreeSelectOpen}
                                                            onOpen={() => {
                                                                setIsEditingRowTreeSelectOpen(true);
                                                                // Pre-select if current description matches an item/category in tree
                                                                const foundNode = findNodeByNameAndTypePure(combinedTreeData, normalizeString(editingRowData?.description || ''), (editingRowData?.isCategory ?? false) ? 'category' : 'item');
                                                                if (foundNode) {
                                                                    setEditingRowSelectedUnifiedNodeId(foundNode.id);
                                                                } else {
                                                                    setEditingRowSelectedUnifiedNodeId(null);
                                                                }
                                                                setEditingRowTreeSearchTerm('');
                                                            }}
                                                            onClose={() => {
                                                                setIsEditingRowTreeSelectOpen(false);
                                                            }}
                                                            onChange={() => { /* handled by CombinedTreeMenuItem's onSelect */ }}
                                                            renderValue={(selected) => renderSelectValue(selected as string, true, editingRowTreeSearchTerm)}
                                                            MenuProps={{
                                                                PaperProps: { style: { maxHeight: 400, width: 450 } },
                                                            }}
                                                        >
                                                            <Box sx={{ p: 1, borderBottom: 1, borderColor: 'divider' }}>
                                                                <TextField
                                                                    fullWidth
                                                                    autoFocus
                                                                    size="small"
                                                                    placeholder="Ürün ara..."
                                                                    value={editingRowTreeSearchTerm}
                                                                    onChange={(e) => setEditingRowTreeSearchTerm(e.target.value)}
                                                                    onClick={(e) => e.stopPropagation()}
                                                                    onKeyDown={(e) => e.stopPropagation()}
                                                                    InputProps={{
                                                                        startAdornment: (<InputAdornment position="start"><IconSearch size={18} /></InputAdornment>),
                                                                    }}
                                                                />
                                                            </Box>

                                                            {loadingTree ? (
                                                                <MuiMenuItem disabled><CircularProgress size={20} sx={{ mr: 1 }} /> Yükleniyor...</MuiMenuItem>
                                                            ) : (
                                                                <List component="div" disablePadding>
                                                                    {filteredTreeForEditingRowDisplay.map((node) => (
                                                                        <CombinedTreeMenuItem
                                                                            key={node.id}
                                                                            node={node}
                                                                            selectedId={editingRowSelectedUnifiedNodeId}
                                                                            onSelect={handleEditRecordTreeSelection}
                                                                            isSearchActive={!!editingRowTreeSearchTerm}
                                                                            isNodeAncestorOfSpecificSelectedId={isNodeAncestorOfEditingRowSelected}
                                                                        />
                                                                    ))}
                                                                </List>
                                                            )}
                                                        </Select>
                                                    </FormControl>
                                                ) : (
                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                        <Typography variant="body2" sx={{
                                                            fontWeight: 'normal',
                                                            paddingLeft: '0px'
                                                        }}>
                                                            {row.description}
                                                        </Typography>
                                                        {row.isUnregisteredItem && (
                                                            <CustomTooltip placement="right"
                                                                title={
                                                                    row.isCategory ?
                                                                        "Bu kategori sistemde kayıtlı değil. Lütfen kaydetmeden önce bu kategoriyi ekleyin." :
                                                                        "Bu ürün sistemde kayıtlı değil. Lütfen kaydetmeden önce bu ürünü ekleyin."
                                                                }>
                                                                <IconButton size="small" onClick={() => handleOpenRegisterModalForUnregisteredRow(row)} sx={{ p: 0 }}>
                                                                    <IconPlus size={18} color={theme.palette.success.main} />
                                                                </IconButton>
                                                            </CustomTooltip>
                                                        )}
                                                    </Box>
                                                )}
                                            </TableCell>
                                            <TableCell sx={{ borderRight: '1px solid ' + theme.palette.divider, textAlign: 'center' }}>
                                                {editingRowId === row.id ? (
                                                    <CustomTextField
                                                        id={`olcuBrimi-${row.id}`}
                                                        name="olcuBrimi"
                                                        type="text"
                                                        size="small"
                                                        value={editingRowData?.olcuBrimi || ''}
                                                        onChange={handleEditRowInputChange}
                                                        sx={{ width: 90, '& input': { textAlign: 'center' } }}
                                                        disabled={editingRowData?.isCategory} // Disable if it's a category
                                                    />
                                                ) : (
                                                    <Typography variant="body2" sx={{ textAlign: 'center' }}>{row.olcuBrimi}</Typography>
                                                )}
                                            </TableCell>
                                            {/* NEW: MALZEME (new input field) */}
                                            <TableCell sx={{ textAlign: 'center' }}>
                                                {editingRowId === row.id ? (
                                                    <CustomTextField
                                                        id={`malzeme-${row.id}`}
                                                        name="malzeme"
                                                        type="text"
                                                        size="small"
                                                        value={formatInputNumberForDisplay(editingRowData?.malzeme ?? null, 0)}
                                                        onChange={handleEditRowInputChange}
                                                        sx={{ width: 70, '& input': { textAlign: 'center' } }}
                                                    />
                                                ) : (
                                                    formatNumber(row.malzeme, 0)
                                                )}
                                            </TableCell>
                                            <TableCell sx={{ textAlign: 'center' }}>
                                                {editingRowId === row.id ? (
                                                    <CustomTextField
                                                        type="text"
                                                        size="small"
                                                        value={formatInputNumberForDisplay(editingRowData?.malzemeYuklenici ?? null, 0)}
                                                        name="malzemeYuklenici"
                                                        onChange={handleEditRowInputChange}
                                                        sx={{ width: 70, '& input': { textAlign: 'center' } }}
                                                    />
                                                ) : (
                                                    formatNumber(row.malzemeYuklenici, 0)
                                                )}
                                            </TableCell>
                                            <TableCell sx={{ textAlign: 'center' }}>
                                                {editingRowId === row.id ? (
                                                    <CustomTextField
                                                        id={`montaj-${row.id}`}
                                                        name="montaj"
                                                        type="text"
                                                        size="small"
                                                        value={formatInputNumberForDisplay(editingRowData?.montaj ?? null, 0)}
                                                        
                                                        sx={{ width: 70, '& input': { textAlign: 'center' } }}
                                                        disabled={true} // MONTAJ MİKTARI is read-only
                                                    />
                                                ) : (
                                                    formatNumber(row.montaj, 0)
                                                )}
                                            </TableCell>
                                            <TableCell sx={{ textAlign: 'center' }}>
                                                {editingRowId === row.id ? (
                                                    <CustomTextField
                                                        id={`demontaj-${row.id}`}
                                                        name="demontaj"
                                                        type="text"
                                                        size="small"
                                                        value={formatInputNumberForDisplay(editingRowData?.demontaj ?? null, 0)}
                                                        onChange={handleEditRowInputChange}
                                                        sx={{ width: 70, '& input': { textAlign: 'center' } }}
                                                    />
                                                ) : (
                                                    formatNumber(row.demontaj, 0)
                                                )}
                                            </TableCell>
                                            <TableCell sx={{ borderRight: '1px solid ' + theme.palette.divider, textAlign: 'center' }}>
                                                {editingRowId === row.id ? (
                                                    <CustomTextField
                                                        id={`demontajMontaj-${row.id}`}
                                                        name="demontajMontaj"
                                                        type="text"
                                                        size="small"
                                                        value={editingRowId === row.id ? formatInputNumberForDisplay(editingRowData?.demontajMontaj ?? null, 0) : formatNumber(row.demontajMontaj, 0)}
                                                        onChange={handleEditRowInputChange}
                                                        sx={{ width: 70, '& input': { textAlign: 'center' } }}
                                                    />
                                                ) : (
                                                    formatNumber(row.demontajMontaj, 0)
                                                )}
                                            </TableCell>

                                            <TableCell sx={{ textAlign: 'center' }}>
                                                {editingRowId === row.id ? (
                                                    <CustomTextField
                                                        id={`birimFiyatMalzeme-${row.id}`}
                                                        name="birimFiyatMalzeme"
                                                        type="text"
                                                        size="small"
                                                        value={editingBirimFiyatMalzeme}
                                                        onChange={handleEditRowInputChange}
                                                        sx={{ width: 70, '& input': { textAlign: 'center' } }}
                                                    />
                                                ) : (
                                                    formatNumber(row.birimFiyatMalzeme, 2)
                                                )}
                                            </TableCell>
                                            <TableCell sx={{ textAlign: 'center' }}>
                                                {editingRowId === row.id ? (
                                                    <CustomTextField
                                                        id={`birimFiyatMontaj-${row.id}`}
                                                        name="birimFiyatMontaj"
                                                        type="text"
                                                        size="small"
                                                        value={editingBirimFiyatMontaj}
                                                        onChange={handleEditRowInputChange}
                                                        sx={{ width: 70, '& input': { textAlign: 'center' } }}
                                                    />
                                                ) : (
                                                    formatNumber(row.birimFiyatMontaj, 2)
                                                )}
                                            </TableCell>
                                            <TableCell sx={{ textAlign: 'center' }}>
                                                {editingRowId === row.id ? (
                                                    <CustomTextField
                                                        id={`birimFiyatDemontaj-${row.id}`}
                                                        name="birimFiyatDemontaj"
                                                        type="text"
                                                        size="small"
                                                        value={editingBirimFiyatDemontaj}
                                                        onChange={handleEditRowInputChange}
                                                        sx={{ width: 70, '& input': { textAlign: 'center' } }}
                                                    />
                                                ) : (
                                                    formatNumber(row.birimFiyatDemontaj, 2)
                                                )}
                                            </TableCell>
                                            <TableCell sx={{ borderRight: '1px solid ' + theme.palette.divider, textAlign: 'center' }}>
                                                {editingRowId === row.id ? (
                                                    <CustomTextField
                                                        id={`birimFiyatDemontajMontaj-${row.id}`}
                                                        name="birimFiyatDemontajMontaj"
                                                        type="text"
                                                        size="small"
                                                        value={editingBirimFiyatDemontajMontaj}
                                                        onChange={handleEditRowInputChange}
                                                        sx={{ width: 70, '& input': { textAlign: 'center' } }}
                                                    />
                                                ) : (
                                                    formatNumber(row.birimFiyatDemontajMontaj, 2)
                                                )}
                                            </TableCell>

                                            <TableCell sx={{ borderRight: '1px solid ' + theme.palette.divider }}>
                                                {editingRowId === row.id ? (
                                                    <CustomTextField
                                                        id={`aciklama-${row.id}`}
                                                        name="aciklama"
                                                        multiline
                                                        rows={2}
                                                        size="small"
                                                        value={editingRowData?.aciklama || ''}
                                                        onChange={handleEditRowInputChange}
                                                        sx={{ width: 180 }}
                                                        placeholder="Açıklama girin..."
                                                    />
                                                ) : (
                                                    <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>{row.aciklama}</Typography>
                                                )}
                                            </TableCell>
                                            {/* NEW: %Kategoriler - only editable for categories */}
                                            <TableCell sx={{ borderRight: '1px solid ' + theme.palette.divider }}>
                                                {editingRowId === row.id && editingRowData?.isCategory ? (
                                                    <CustomTextField
                                                        id={`categoryPercentage-${row.id}`}
                                                        name="categoryPercentage"
                                                        type="text"
                                                        size="small"
                                                        value={formatInputNumberForDisplay(editingRowData?.categoryPercentage ?? null, 2)}
                                                        onChange={handleEditRowInputChange}
                                                        sx={{ width: 90, '& input': { textAlign: 'center' } }}
                                                        disabled={!editingRowData?.isCategory}
                                                        placeholder={editingRowData?.isCategory ? "%n" : "N/A"}
                                                    />
                                                ) : (
                                                    <Typography variant="body2" sx={{ textAlign: 'center', color: row.isCategory ? 'text.primary' : 'text.secondary' }}>
                                                        {row.isCategory && row.categoryPercentage !== null ? formatNumber(row.categoryPercentage, 2) : ''}
                                                    </Typography>
                                                )}
                                            </TableCell>
                                            <TableCell sx={{ textAlign: 'center' }}>
                                                {editingRowId === row.id ? (
                                                    <CustomTextField
                                                        id={`toplamMalzeme-${row.id}`}
                                                        name="toplamMalzeme"
                                                        type="text"
                                                        size="small"
                                                        value={formatNumber(editingRowData?.toplamMalzeme ?? null, 2)}
                                                        sx={{ width: 90, '& input': { textAlign: 'center' } }}
                                                        disabled={true} // TUTARLAR is read-only
                                                    />
                                                ) : (
                                                    formatNumber(row.toplamMalzeme, 2)
                                                )}
                                            </TableCell>
                                            <TableCell sx={{ textAlign: 'center' }}>
                                                {editingRowId === row.id ? (
                                                    <CustomTextField
                                                        id={`toplamMontaj-${row.id}`}
                                                        name="toplamMontaj"
                                                        type="text"
                                                        size="small"
                                                        value={formatNumber(editingRowData?.toplamMontaj ?? null, 2)}
                                                        sx={{ width: 90, '& input': { textAlign: 'center' } }}
                                                        disabled={true} // TUTARLAR is read-only
                                                    />
                                                ) : (
                                                    formatNumber(row.toplamMontaj, 2)
                                                )}
                                            </TableCell>
                                            <TableCell sx={{ textAlign: 'center' }}>
                                                {editingRowId === row.id ? (
                                                    <CustomTextField
                                                        id={`toplamDemontaj-${row.id}`}
                                                        name="toplamDemontaj"
                                                        type="text"
                                                        size="small"
                                                        value={formatNumber(editingRowData?.toplamDemontaj ?? null, 2)}
                                                        sx={{ width: 90, '& input': { textAlign: 'center' } }}
                                                        disabled={true} // TUTARLAR is read-only
                                                    />
                                                ) : (
                                                    formatNumber(row.toplamDemontaj, 2)
                                                )}
                                            </TableCell>
                                            <TableCell sx={{ textAlign: 'center' }}>
                                                {editingRowId === row.id ? (
                                                    <CustomTextField
                                                        id={`toplamDemontajdanMontaj-${row.id}`}
                                                        name="toplamDemontajdanMontaj"
                                                        type="text"
                                                        size="small"
                                                        value={formatNumber(editingRowData?.toplamDemontajdanMontaj ?? null, 2)}
                                                        sx={{ width: 90, '& input': { textAlign: 'center' } }}
                                                        disabled={true} // TUTARLAR is read-only
                                                    />
                                                ) : (
                                                    formatNumber(row.toplamDemontajdanMontaj, 2)
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                <Stack direction="row" spacing={0.5}>
                                                    {editingRowId === row.id ? (
                                                        <>
                                                            <CustomTooltip title={isTooltipGloballyEnabled ? "Girişi güncelle" : ""}>
                                                                <IconButton size="small" color="primary" onClick={handleUpdateGridRow}
                                                                    disabled={isLoading || loading || isSavingAll}
                                                                >
                                                                    <DoneRoundedIcon sx={{ fontSize: 20 }} />
                                                                </IconButton>
                                                            </CustomTooltip>
                                                            <CustomTooltip title={isTooltipGloballyEnabled ? "Düzenlemeyi iptal et" : ""}>
                                                                <IconButton size="small" color="secondary" onClick={handleCancelEditGridRow}
                                                                    disabled={isLoading || loading || isSavingAll}
                                                                >
                                                                    <DoNotDisturbOnRoundedIcon sx={{ fontSize: 20 }} />
                                                                </IconButton>
                                                            </CustomTooltip>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <CustomTooltip title={isTooltipGloballyEnabled ? "Satırı düzenle" : ""}>
                                                                <IconButton size="small" onClick={() => handleEditGridRow(row.id)}
                                                                    disabled={loading || isSavingAll || isLoading}
                                                                >
                                                                    <IconEdit size={18} />
                                                                </IconButton>
                                                            </CustomTooltip>
                                                            <CustomTooltip title={isTooltipGloballyEnabled ? "Satırı sil" : ""}>
                                                                <IconButton size="small" onClick={() => handleDeleteGridRow(row.id)}
                                                                    disabled={loading || isSavingAll || isLoading}
                                                                >
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
                                        <TableCell colSpan={21} align="center">
                                            <Typography variant="subtitle1" color="textSecondary">
                                                Henüz detay girişi yapılmadı.
                                            </Typography>
                                        </TableCell>
                                    </TableRow>
                                )}
                                {hasMoreData && processedAndFilteredGridData.length > displayedGridData.length && (
                                    <TableRow>
                                        <TableCell colSpan={21} align="center">
                                            <CircularProgress size={20} />
                                            <Typography variant="body2" color="text.secondary" ml={1} component="span">Daha Fazla Yükleniyor...</Typography>
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </Box>
            </BlankCard>

            <Paper elevation={3} sx={{ p: 2, mt: 3 }}>
                <Grid container spacing={2}>
                    <Grid item xs={12} sm={6} md={3}>
                        <Typography variant="subtitle1" fontWeight="600">MALZEME TUTARI-TL Toplamı:</Typography>
                        <Typography variant="h5" color="primary">
                            {formatNumber(totalMalzemeTutariTl, 2)}
                        </Typography>
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                        <Typography variant="subtitle1" fontWeight="600">MONTAJ TUTARI-TL Toplamı:</Typography>
                        <Typography variant="h5" color="primary">
                            {formatNumber(totalMontajTutariTl, 2)}
                        </Typography>
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                        <Typography variant="subtitle1" fontWeight="600">DEMONTAJ TUTARI-TL Toplamı:</Typography>
                        <Typography variant="h5" color="primary">
                            {formatNumber(totalDemontajTutariTl, 2)}
                        </Typography>
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                        <Typography variant="subtitle1" fontWeight="600">DMM TUTARI-TL Toplamı:</Typography>
                        <Typography variant="h5" color="primary">
                            {formatNumber(totalDmmTutariTl, 2)}
                        </Typography>
                    </Grid>
                    <Grid item xs={12}>
                        <Typography variant="subtitle1" fontWeight="600" mt={2}>
                            TOPLAM KEŞİF BEDELİ TL:
                        </Typography>
                        <Typography variant="h4" color="secondary">
                            {formatNumber(totalKesifBedeliTl, 2)}
                        </Typography>
                    </Grid>
                </Grid>
            </Paper>
            {itemToRegister && (
                <RegisterUnregisteredItemModal
                    open={openRegisterItemModal}
                    onClose={handleCloseRegisterItemModal}
                    onRegisterSuccess={handleRegistrationSuccess}
                    initialData={itemToRegister}
                    showAlert={showAlert}
                />
            )}
            {categoryToRegister && (
                <RegisterUnregisteredCategoryModal
                    open={openRegisterCategoryModal}
                    onClose={handleCloseRegisterCategoryModal}
                    onRegisterSuccess={handleRegistrationSuccess}
                    initialData={categoryToRegister}
                    showAlert={showAlert}
                />
            )}
            <Backdrop
                sx={{ color: '#fff', zIndex: (theme) => theme.zIndex.drawer + 1 }}
                open={isLoading}
            >
                <CircularProgress color="inherit" />
            </Backdrop>
        </Box>
    );
};

export default TenderDetails;