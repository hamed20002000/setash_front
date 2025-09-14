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
    Backdrop,
    Chip
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import {
    IconPlus, IconSearch,
    IconEdit, IconTrash, IconCloudUpload, IconCheck,
    IconChevronDown,
    IconChevronRight,
    IconFileExport,
    IconDownload, IconArrowRight
} from '@tabler/icons-react';
import DoNotDisturbOnRoundedIcon from '@mui/icons-material/DoNotDisturbOnRounded';
import DoneRoundedIcon from '@mui/icons-material/DoneRounded';
import CustomTextField from 'src/components/forms/theme-elements/CustomTextField';
import BlankCard from 'src/components/shared/BlankCard';
import "./style.css"
import { useTooltip, CustomTooltip } from 'src/context/TooltipContext';
import * as XLSX from 'xlsx';
import Excel from 'exceljs';
import { saveAs } from 'file-saver';
import axios from 'axios';
import server from 'src/assets/address.json';
import RegisterUnregisteredItemModal from './RegisterUnregisteredItemModal';
import RegisterUnregisteredCategoryModal from './RegisterUnregisteredCategoryModal';
import { RegisterItemInitialData } from './RegisterUnregisteredItemModal';
import { RegisterCategoryInitialData } from './RegisterUnregisteredCategoryModal';

import { keyframes } from '@mui/system';


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
    id: string;
    name: string;
    parentId: string | null;
    categories: ApiCategoryType[];
    depth?: number;
    percent?: number;
    createAt?: string;
    recordStatus?: number;
    description?: string;
    eskiPoz?: string;
    title?: string;
}

export interface ApiItemType {
    id: number;
    name: string;
    category: { id: string; name?: string; };
    unit: { title: string; };
    code?: string | null;
    description?: string;
    createAt?: string;
    recordStatus?: number;
    abbreviation?: string;
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

interface TenderDetailFromApi {
    id: number;
    firmProcuredItemQuantities: string;
    eskiPoz: string | null;
    tedas: string | null;
    ana: string | null;
    alt: string | null;
    ourProcuredItemQuantities: string;
    demontaj: string;
    demontajMontaj: string;
    firmProcuredItemPrice: string;
    ourProcuredItemPrice: string;
    montajPrice: string;
    demontajPrice: string;
    demontajMontajPrice: string;
    malzemeTutari: string;
    montajTutari: string;
    demontajTutari: string;
    dMMTutari: string;
    recordStatus: number;
    createAt: string;
    item: ApiItemType;
}

interface TenderCategoryFromApi {
    id: string;
    percent: number;
    description: string;
    recordStatus: number;
    createAt: string;
    tenderDetails: TenderDetailFromApi[];
    title?: string;
    eskiPoz?: string;
}

interface GetTenderByIdRawResponse {
    success: boolean;
    httpStatusCode: number;
    httpStatusCodeName: string;
    message: string;
    data: {
        id: string;
        title: string;
        createAt: string;
        recordStatus: number;
        status: number | null;
        statusDate: string | null;
        tenderCategories: TenderCategoryFromApi[];
    };
    errors: any[];
}
const blinkAnimation = keyframes`
  0% { box-shadow: 0 0 0px 0px rgba(103, 58, 183, 0.7); }
  50% { box-shadow: 0 0 10px 5px rgba(103, 58, 183, 0.7); }
  100% { box-shadow: 0 0 0px 0px rgba(103, 58, 183, 0.7); }
`;
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

const parseAndCleanFloat = (value: string | number | null | undefined): number => {
    if (value === null || value === undefined) return 0;
    if (typeof value === 'number') {
        return value;
    }
    let cleanedValue = String(value)
        .replace(/\$/g, '')
        .replace(/,/g, '.');
    const parts = cleanedValue.split('.');
    if (parts.length > 2) {
        cleanedValue = parts[0] + '.' + parts.slice(1).join('');
    }
    cleanedValue = cleanedValue.replace(/[^0-9.]/g, '');
    const parsed = parseFloat(cleanedValue);
    return isNaN(parsed) ? 0 : parsed;
};

const parseAndCleanInt = (value: string | number | null | undefined): number => {
    if (value === null || value === undefined) return 0;
    if (typeof value === 'number') {
        return value;
    }
    const cleanedValue = String(value)
        .replace(/\$/g, '')
        .replace(/,/g, '')
        .replace(/[^0-9]/g, '');

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
    const initialTenderDetailsLoadRef = useRef<{ [key: string]: boolean }>({});
    const [newRecordRow, setNewRecordRow] = useState<TenderDetailRow>({
        id: 0, siraNo: 0, eskiPoz: '', tedasNo: 0, anaNo: 0, altNo: 0,
        description: '', olcuBrimi: '', malzeme: 0,
        malzemeYuklenici: 0, montaj: 0, demontaj: 0, demontajMontaj: 0,
        birimFiyatMalzeme: 0, birimFiyatMontaj: 0, birimFiyatDemontaj: 0, birimFiyatDemontajMontaj: 0,
        toplamMalzeme: 0, toplamMontaj: 0, toplamDemontaj: 0, toplamDemontajdanMontaj: 0,
        isUnregisteredItem: false, itemId: null, aciklama: '',
        categoryPercentage: null, isCategory: false, isFromExcel: false,
    });
    // const [birimFiyatMalzemeNew, setBirimFiyatMalzemeNew] = useState<string>("0");
    // const [birimFiyatMontajNew, setBirimFiyatMontajNew] = useState<string>("0");
    // const [birimFiyatDemontajNew, setBirimFiyatDemontajNew] = useState<string>("0");
    // const [birimFiyatDemontajMontajNew, setBirimFiyatDemontajMontajNew] = useState<string>("0");
    const [editingBirimFiyatMalzeme, setEditingBirimFiyatMalzeme] = useState<string>('');
    const [editingBirimFiyatMontaj, setEditingBirimFiyatMontaj] = useState<string>('');
    const [editingBirimFiyatDemontaj, setEditingBirimFiyatDemontaj] = useState<string>('');
    const [editingBirimFiyatDemontajMontaj, setEditingBirimFiyatDemontajMontaj] = useState<string>('');
    const [editingRowId, setEditingRowId] = useState<number | null>(null);
    const [editingRowData, setEditingRowData] = useState<TenderDetailRow | null>(null);
    const [openRegisterItemModal, setOpenRegisterItemModal] = useState(false);
    const [itemToRegister, setItemToRegister] = useState<RegisterItemInitialData | null>(null);
    const [openRegisterCategoryModal, setOpenRegisterCategoryModal] = useState(false);
    const [categoryToRegister, setCategoryToRegister] = useState<RegisterCategoryInitialData | null>(null);
    // const [templateWorkbookBuffer, setTemplateWorkbookBuffer] = useState<ArrayBuffer | null>(null);
    const newRecordSelectedNode = newRecordSelectedUnifiedNodeId
        ? findNodeByIdPure(combinedTreeData, newRecordSelectedUnifiedNodeId)
        : null;
    const isSelectedNodeAnItem = newRecordSelectedNode?.type === 'item';

    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

    const hasParentCategoryPercentage = useMemo(() => {
        if (!isSelectedNodeAnItem) return false;
        const parentCategory = (newRecordSelectedNode?.originalData as ApiItemType)?.category;
        if (!parentCategory) return false;

        // const parentCategoryId = parentCategory.id;
        return gridData.some(row => {
            const itemNodeInTree = findNodeByIdPure(combinedTreeData, `item-${row.itemId}`);
            if (itemNodeInTree && itemNodeInTree.type === 'item') {
                const parentCategoryId = (itemNodeInTree.originalData as ApiItemType)?.category?.id;
                return parentCategoryId === (newRecordSelectedNode?.originalData as ApiItemType)?.category?.id && row.categoryPercentage !== null;
            }

            return false;
        });
    }, [isSelectedNodeAnItem, newRecordSelectedNode, combinedTreeData, gridData]);


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
                montaj: (row.malzeme ?? 0) + (row.malzemeYuklenici ?? 0),
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

    const findParentCategoryForGridRow = (row: TenderDetailRow): TenderDetailRow | undefined => {
        if (row.itemId === null) return undefined;
        const itemNode = findNodeByIdPure(combinedTreeData, `item-${row.itemId}`);
        if (itemNode && itemNode.originalData && 'category' in itemNode.originalData) {
            const parentCatNode = findNodeByIdPure(combinedTreeData, `cat-${(itemNode.originalData as ApiItemType).category.id}`);

            if (parentCatNode && parentCatNode.originalData) {
                return {
                    id: -1,
                    siraNo: 0,
                    eskiPoz: (parentCatNode.originalData as ApiCategoryType).eskiPoz || '',
                    tedasNo: 0,
                    anaNo: 0,
                    altNo: 0,
                    description: parentCatNode.name,
                    olcuBrimi: '',
                    malzeme: 0,
                    malzemeYuklenici: 0,
                    montaj: 0,
                    demontaj: 0,
                    demontajMontaj: 0,
                    birimFiyatMalzeme: 0,
                    birimFiyatMontaj: 0,
                    birimFiyatDemontaj: 0,
                    birimFiyatDemontajMontaj: 0,
                    aciklama: '',
                    categoryPercentage: (parentCatNode.originalData as ApiCategoryType).percent || null,
                    isCategory: true,
                    toplamMalzeme: 0,
                    toplamMontaj: 0,
                    toplamDemontaj: 0,
                    toplamDemontajdanMontaj: 0,
                    isUnregisteredItem: false,
                    itemId: null,
                    isFromExcel: false
                };
            }
        }

        return undefined;
    };

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
        if (displayMode === 'withCategory') {
            const result: TenderDetailRow[] = [];
            const categoryMap = new Map<string, TenderDetailRow>();

            currentData.forEach(row => {
                if (row.isCategory) {
                    // اگر ردیف یک کتگوری است
                    categoryMap.set(row.description, row);
                    result.push(row);
                } else {
                    // اگر ردیف یک آیتم است
                    const parentCategory = findParentCategoryForGridRow(row);
                    if (parentCategory) {
                        // آیتم را زیر کتگوری والد قرار دهید
                        if (!categoryMap.has(parentCategory.description)) {
                            categoryMap.set(parentCategory.description, parentCategory);
                            result.push(parentCategory);
                        }
                    }
                    result.push(row);
                }
            });
            currentData = result;
        } else {
            // حالت بدون کتگوری
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



    const fetchDataAndBuildTree = useCallback(async () => {
        console.log("Fetching and building tree data...");
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
        } catch (error: any) {
            showAlert('Kategori ve ürünler yüklenirken bir hata oluştu.', 'error');
            setIsTreeDataLoaded(false);
        } finally {
            setLoadingTree(false);
        }
    }, [navigate, showAlert]);

    const refreshCombinedTreeData = useCallback(async () => {
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
        } catch (error: any) {
            showAlert('Kategori ve ürünler güncellenirken bir hata oluştu.', 'error');
        } finally {
            setLoadingTree(false);
        }
    }, [navigate, showAlert]);

    const loadExistingTenderDetails = useCallback(async () => {
        console.log("Loading existing tender details...");
        if (!tenderId || !isTreeDataLoaded) {
            return;
        }
        // if (initialTenderDetailsLoadRef.current[tenderId]) {
        //     return;
        // }
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
                            id: currentLocalIdCounter++,
                            siraNo: 0,
                            eskiPoz: category.eskiPoz || "",
                            tedasNo: 0,
                            anaNo: 0,
                            altNo: 0,
                            description: category.title || "",
                            olcuBrimi: "",
                            malzeme: 0,
                            malzemeYuklenici: 0,
                            montaj: 0,
                            demontaj: 0,
                            demontajMontaj: 0,
                            birimFiyatMalzeme: 0,
                            birimFiyatMontaj: 0,
                            birimFiyatDemontaj: 0,
                            birimFiyatDemontajMontaj: 0,
                            toplamMalzeme: 0,
                            toplamMontaj: 0,
                            toplamDemontaj: 0,
                            toplamDemontajdanMontaj: 0,
                            isUnregisteredItem: false,
                            itemId: null,
                            aciklama: category.description || "",
                            categoryPercentage: category.percent !== undefined && category.percent !== null ? category.percent : null,
                            isCategory: true,
                            isFromExcel: false,
                        }, true);
                        loadedDetails.push(categoryRow);

                        if (Array.isArray(category.tenderDetails)) {
                            const itemDetails = category.tenderDetails.map((detail, index) => {
                                const firmProcuredItemQuantities = parseAndCleanFloat(detail.firmProcuredItemQuantities);
                                const ourProcuredItemQuantities = parseAndCleanFloat(detail.ourProcuredItemQuantities);
                                const demontaj = parseAndCleanFloat(detail.demontaj);
                                const demontajMontaj = parseAndCleanFloat(detail.demontajMontaj);
                                const firmProcuredItemPrice = parseAndCleanFloat(detail.firmProcuredItemPrice);
                                const montajPrice = parseAndCleanFloat(detail.montajPrice);
                                const demontajPrice = parseAndCleanFloat(detail.demontajPrice);
                                const demontajMontajPrice = parseAndCleanFloat(detail.demontajMontajPrice);
                                const malzemeTutari = parseAndCleanFloat(detail.malzemeTutari);
                                const montajTutari = parseAndCleanFloat(detail.montajTutari);
                                const demontajTutari = parseAndCleanFloat(detail.demontajTutari);
                                const dMMTutari = parseAndCleanFloat(detail.dMMTutari);
                                const tedasNo = parseAndCleanInt(detail.tedas);
                                const anaNo = parseAndCleanInt(detail.ana);
                                const altNo = parseAndCleanInt(detail.alt);
                                const eskiPoz = String(detail.eskiPoz || '');
                                let itemDescription: string = "";
                                let itemUnit: string = "";
                                const foundItemNode = detail.item ? findNodeByIdPure(combinedTreeData, `item-${detail.item.id}`) : undefined;

                                if (foundItemNode && foundItemNode.type === 'item' && foundItemNode.originalData) {
                                    itemDescription = (foundItemNode.originalData as ApiItemType).name;
                                    itemUnit = (foundItemNode.originalData as ApiItemType).unit?.title || "";
                                } else if (detail.item) {
                                    itemDescription = detail.item.name || "";
                                    itemUnit = detail.item.unit?.title || "";
                                }
                                const aciklama = "";
                                const baseRow: Partial<TenderDetailRow> = {
                                    id: Number(detail.id),
                                    siraNo: index + 1,
                                    eskiPoz: eskiPoz,
                                    tedasNo: tedasNo,
                                    anaNo: anaNo,
                                    altNo: altNo,
                                    description: itemDescription,
                                    olcuBrimi: itemUnit,
                                    malzeme: firmProcuredItemQuantities,
                                    malzemeYuklenici: ourProcuredItemQuantities,
                                    montaj: (firmProcuredItemQuantities + ourProcuredItemQuantities),
                                    demontaj: demontaj,
                                    demontajMontaj: demontajMontaj,
                                    birimFiyatMalzeme: firmProcuredItemPrice,
                                    birimFiyatMontaj: montajPrice,
                                    birimFiyatDemontaj: demontajPrice,
                                    birimFiyatDemontajMontaj: demontajMontajPrice,
                                    toplamMalzeme: malzemeTutari,
                                    toplamMontaj: montajTutari,
                                    toplamDemontaj: demontajTutari,
                                    toplamDemontajdanMontaj: dMMTutari,
                                    isUnregisteredItem: !foundItemNode,
                                    itemId: detail.item?.id || null,
                                    aciklama: aciklama,
                                    categoryPercentage: category.percent !== undefined && category.percent !== null ? category.percent : null,
                                    isCategory: false,
                                    isFromExcel: false,
                                };
                                return calculateTotals(baseRow, true);
                            });
                            loadedDetails = loadedDetails.concat(itemDetails);
                        }
                    });
                }
                setGridData(loadedDetails);
                showAlert('İhale detayları başarıyla yüklendi.', 'success');
                initialTenderDetailsLoadRef.current[tenderId] = true;
            } else {
                setGridData([]);
                showAlert('Bu ihale için detay bulunamadı veya API yanıtı geçersiz.', 'info');
                initialTenderDetailsLoadRef.current[tenderId] = false;
            }
        } catch (error: any) {
            if (axios.isAxiosError(error) && error.response && error.response.status === 401) {
                localStorage.removeItem('authToken');
                navigate("/");
                showAlert('Oturumunuzun süresi doldu veya yetkiniz yok. Lütfen tekrar giriş yapın.', 'error');
            }
            showAlert('İhale detayları yüklenirken bir hata oluştu.', 'error');
            setGridData([]);
            initialTenderDetailsLoadRef.current[tenderId] = false;
        } finally {
            setLoading(false);
        }
    }, [tenderId, navigate, showAlert, calculateTotals, combinedTreeData, isTreeDataLoaded]);

    // useEffect(() => {
    //     if (!isTreeDataLoaded) {
    //         fetchDataAndBuildTree();
    //         return;
    //     }
    //     if (tenderId && isTreeDataLoaded && !initialTenderDetailsLoadRef.current[tenderId]) {
    //         loadExistingTenderDetails();
    //     }
    // }, [tenderId, isTreeDataLoaded, fetchDataAndBuildTree, loadExistingTenderDetails]);

    // در useEffect مربوط به بارگذاری اولیه
    useEffect(() => {
        if (!isTreeDataLoaded) {
            fetchDataAndBuildTree();
            return;
        }
        if (tenderId && isTreeDataLoaded && !initialTenderDetailsLoadRef.current[tenderId]) {
            loadExistingTenderDetails();
        }
    }, [tenderId, isTreeDataLoaded, fetchDataAndBuildTree, loadExistingTenderDetails]); // loadExistingTenderDetails باید به لیست وابستگی ها اضافه شود

    // useEffect(() => {
    //     fetch('/tender_template.xlsx')
    //         .then(response => {
    //             if (!response.ok) {
    //                 throw new Error(`HTTP error! status: ${response.status}`);
    //             }
    //             return response.arrayBuffer();
    //         })
    //         .then(buffer => {
    //             setTemplateWorkbookBuffer(buffer);
    //         })
    //         .catch(error => {
    //             console.log(error)
    //             showAlert('Excel şablonu yüklenirken hata oluştu.', 'error');
    //         });
    // }, [showAlert]);

    const addNewItemToApi = useCallback(async (itemName: string): Promise<number | null> => {
        const authToken = localStorage.getItem('authToken');
        if (!authToken) {
            showAlert('Oturumunuzun süresi doldu.', 'error');
            navigate("/");
            return null;
        }
        try {
            const defaultCategoryId = "some-default-category-id";
            const response = await axios.post(
                server.baseurl + server.baseinfo + "create-item",
                { name: itemName, categoryId: defaultCategoryId, unitId: null },
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
                    const montaj = parseAndCleanInt(getCellValue(R, 8));
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
        const { name, value } = e.target;

        setNewRecordRow(prev => {
            let updatedRow = { ...prev };

            // مدیریت فیلدهای عددی
            const numericFieldNames = [
                'malzeme', 'malzemeYuklenici', 'demontaj', 'demontajMontaj',
                'birimFiyatMalzeme', 'birimFiyatMontaj', 'birimFiyatDemontaj', 'birimFiyatDemontajMontaj'
            ];

            if (numericFieldNames.includes(name)) {
                // تبدیل مقدار به عدد با استفاده از تابع کمکی
                const parsedNumber = parseAndCleanFloat(value);
                updatedRow = { ...updatedRow, [name as keyof TenderDetailRow]: parsedNumber };
            }
            // مدیریت فیلدهای خاص
            else if (name === 'categoryPercentage') {
                const parsedNumber = parseAndCleanFloat(value);
                updatedRow = { ...updatedRow, categoryPercentage: parsedNumber };
            } else if (name === 'newRecordManualInput') {
                setNewRecordManualInput(String(value));
                updatedRow.description = String(value);
            }
            // مدیریت سایر فیلدها (متنی)
            else {
                updatedRow = { ...updatedRow, [name as keyof TenderDetailRow]: value as any };
            }

            // محاسبه مجدد مجموع‌ها پس از هر تغییر
            return calculateTotals(updatedRow, true);
        });
    }, [calculateTotals, setNewRecordRow, setNewRecordManualInput]);

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
                originalRowId: row.id,
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
                originalRowId: row.id,
            });
            setOpenRegisterItemModal(true);
        }
    }, []);



    const refreshGridData = useCallback(async () => {
        setLoading(true);
        await fetchDataAndBuildTree();
        await loadExistingTenderDetails();
        setLoading(false);
    }, [fetchDataAndBuildTree, loadExistingTenderDetails]);


    const handleRegistrationSuccess = useCallback(async (registeredData: ApiItemType | ApiCategoryType) => {
        setOpenRegisterItemModal(false);
        setOpenRegisterCategoryModal(false);
        setItemToRegister(null);
        setCategoryToRegister(null);


        await refreshCombinedTreeData();
        await refreshGridData();

        showAlert(`Liste başarıyla güncellendi ve "${registeredData.name}" öğesinin durumu ayarlandı!`, 'success');
    }, [showAlert, refreshGridData]);


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
            isUnregisteredItem: !findNodeByNameAndTypePure(combinedTreeData, normalizedFinalDescription, isNewRecordCategory ? 'category' : 'item'),
            itemId: finalItemId,
            aciklama: newRecordRow.aciklama,
            categoryPercentage: newRecordRow.categoryPercentage,
            isCategory: isNewRecordCategory,
            isFromExcel: false,
        }, true);
        setGridData(prev => [...prev, newRecord]);
        setHasUnsavedChanges(true);
        await refreshCombinedTreeData();
        showAlert('Yeni kayıt başarıyla eklendi!', 'success');
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
        // setBirimFiyatMalzemeNew("0");
        // setBirimFiyatMontajNew("0");
        // setBirimFiyatDemontajNew("0");
        // setBirimFiyatDemontajMontajNew("0");
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
            } else if (['malzemeYuklenici', 'tedasNo', 'anaNo', 'altNo'].includes(name)) {
                // این فیلدها همچنان باید عدد صحیح باشند
                cleanedValue = value.replace(/[^0-9]/g, '');
                (updatedData as any)[name] = parseInt(cleanedValue, 10) || 0;
            } else if (['demontaj', 'demontajMontaj', 'malzeme', 'categoryPercentage'].includes(name)) {
                // این فیلدها می‌توانند اعشاری باشند
                cleanedValue = value.replace(/,/g, '.').replace(/[^0-9.]/g, '');
                (updatedData as any)[name] = parseFloat(cleanedValue) || 0;
            } else if (name === 'editingRowDescription') {
                setEditingRowTreeSearchTerm(String(value));
                setEditingRowSelectedUnifiedNodeId(null);
                updatedData.description = String(value);
                updatedData.isCategory = updatedData.olcuBrimi.trim() === '';
                // if (!updatedData.isCategory) updatedData.categoryPercentage = null;
            }
            else if (name === 'aciklama') {
                updatedData.aciklama = String(value);
            }
            else if (name === 'eskiPoz') {
                updatedData.eskiPoz = String(value);
            }
            else if (name === 'olcuBrimi') {
                updatedData.olcuBrimi = String(value);
                updatedData.isCategory = updatedData.olcuBrimi.trim() === '';
                if (!updatedData.isCategory) updatedData.categoryPercentage = null;
            }
            const tempUpdatedData = calculateTotals(updatedData, true);
            const foundNode = findNodeByNameAndTypePure(combinedTreeData, normalizeString(tempUpdatedData.description), tempUpdatedData.isCategory ? 'category' : 'item');
            tempUpdatedData.isUnregisteredItem = !foundNode;
            if (!tempUpdatedData.isCategory) {
                tempUpdatedData.itemId = (foundNode?.originalData as ApiItemType)?.id ?? null;
            } else {
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
            updatedRowData.itemId = null;
        }
        if (!updatedRowData.description) {
            showAlert('Açıklama (MALZEME VEYA İŞİN CİNSİ) alanı boş bırakılamaz!', 'warning');
            return;
        }
        updatedRowData.isCategory = updatedRowData.olcuBrimi.trim() === '';
        if (!updatedRowData.isCategory && !updatedRowData.olcuBrimi) {
            showAlert('Ölçü Birimi boş bırakılamaz! Lütfen geçerli bir ürün seçin.', 'warning');
            return;
        }
        if (!updatedRowData.isCategory) updatedRowData.categoryPercentage = null;
        if (isItemDescriptionDuplicate(updatedRowData.description, gridData, updatedRowData.id)) {
            showAlert(`"${updatedRowData.description}" ürünü zaten listede mevcut. Yinelenen kayıt ekleyemezsiniz. Varolan kaydı düzenleyebilirsiniz.`, 'warning');
            return;
        }
        const normalizedUpdatedDescription = normalizeString(updatedRowData.description);
        let isUnregisteredAfterEdit: boolean;
        if (updatedRowData.isCategory) {
            isUnregisteredAfterEdit = !findNodeByNameAndTypePure(combinedTreeData, normalizedUpdatedDescription, 'category');
            updatedRowData.itemId = null;
        } else {
            isUnregisteredAfterEdit = !findNodeByNameAndTypePure(combinedTreeData, normalizedUpdatedDescription, 'item');
            const nodeFromTree = findNodeByNameAndTypePure(combinedTreeData, normalizedUpdatedDescription, 'item');
            updatedRowData.itemId = (nodeFromTree?.originalData as ApiItemType)?.id ?? null;
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
        const finalCalculatedRow = calculateTotals(updatedRowData, true);
        setGridData(prev => prev.map(row =>
            row.id === editingRowId
                ? finalCalculatedRow
                : row
        ));
        setHasUnsavedChanges(true);
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
            showAlert('Lütfen önce aktif düzenlemeyi tamamlayın veya iptal edin.', 'warning');
            setIsLoading(false);
            return;
        }
        if (processedAndFilteredGridData.some(row => row.isUnregisteredItem && !row.isCategory)) {
            showAlert('Kaydedilmemiş öğeler var. Lütfen kaydetmeden önce tüm öğeleri ekleyin veya listeden seçin.', 'warning');
            setIsLoading(false);
            return;
        }
        setIsSavingAll(true);
        setAlertMessage(null);

        const groupedData: {
            [categoryIdentifier: string]: {
                categoryInfo: {
                    eskiPoz: string | null;
                    title: string | null;
                    percent: number | null;
                    description: string;
                };
                items: TenderDetailRow[];
            };
        } = {};

        gridData.forEach(row => {
            let categoryIdentifier: string;
            let parentCategoryNode: UnifiedTreeNode | undefined = undefined;

            if (row.isCategory) {
                parentCategoryNode = findNodeByNameAndTypePure(combinedTreeData, normalizeString(row.description), 'category');
            } else if (row.itemId !== null) {
                const itemNode = findNodeByIdPure(combinedTreeData, `item-${row.itemId}`);
                if (itemNode && itemNode.originalData && 'category' in itemNode.originalData && itemNode.originalData.category?.id) {
                    parentCategoryNode = findNodeByIdPure(combinedTreeData, `cat-${itemNode.originalData.category.id}`);
                }
            }

            categoryIdentifier = parentCategoryNode?.id || "Uncategorized";

            if (!groupedData[categoryIdentifier]) {
                const categoryName = parentCategoryNode?.name || "Uncategorized Category";
                groupedData[categoryIdentifier] = {
                    categoryInfo: {
                        eskiPoz: (parentCategoryNode?.originalData as any)?.eskiPoz || null,
                        title: (parentCategoryNode?.originalData as any)?.title || categoryName,
                        percent: null,
                        description: (parentCategoryNode?.originalData as any)?.description || "",
                    },
                    items: []
                };
            }

            // منطق جدید برای اختصاص درصد به کتگوری والد
            if (row.categoryPercentage !== null && groupedData[categoryIdentifier].categoryInfo.percent === null) {
                // اگر درصد برای این گروه هنوز تعیین نشده باشد، آن را از این ردیف می‌گیریم.
                groupedData[categoryIdentifier].categoryInfo.percent = row.categoryPercentage;
            }

            if (!row.isCategory) {
                groupedData[categoryIdentifier].items.push(row);
            }
        });

        // ساختن payload نهایی
        const categoriesPayload = Object.values(groupedData).map(group => {
            return {
                eskiPoz: group.categoryInfo.eskiPoz,
                title: group.categoryInfo.title,
                // اگر درصدی پیدا نشد، مقدار پیش‌فرض 0 را استفاده می‌کنیم
                percent: group.categoryInfo.percent !== null ? group.categoryInfo.percent : 0,
                description: group.categoryInfo.description,
                details: group.items.map(itemRow => ({
                    eskiPoz: itemRow.eskiPoz,
                    tedas: String(itemRow.tedasNo),
                    ana: String(itemRow.anaNo),
                    alt: String(itemRow.altNo),
                    firmProcuredItemQuantities: itemRow.malzeme,
                    ourProcuredItemQuantities: itemRow.malzemeYuklenici,
                    demontaj: itemRow.demontaj,
                    demontajMontaj: itemRow.demontajMontaj,
                    firmProcuredItemPrice: String(itemRow.birimFiyatMalzeme),
                    ourProcuredItemPrice: String(itemRow.birimFiyatMalzeme),
                    montajPrice: String(itemRow.birimFiyatMontaj),
                    demontajPrice: String(itemRow.birimFiyatDemontaj),
                    demontajMontajPrice: String(itemRow.birimFiyatDemontajMontaj),
                    malzemeTutari: String(itemRow.toplamMalzeme),
                    montajTutari: String(itemRow.toplamMontaj),
                    demontajTutari: String(itemRow.toplamDemontaj),
                    dMMTutari: String(itemRow.toplamDemontajdanMontaj),
                    itemId: itemRow.itemId!,
                }))
            };
        });

        const payload = {
            id: Number(tenderId),
            title: tenderTitle,
            categories: categoriesPayload,
        };
        try {
            const response = await axios.put(
                server.baseurl + server.initialoperations + "update-tender",
                payload,
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
                setHasUnsavedChanges(false);
                await refreshCombinedTreeData();
                await loadExistingTenderDetails();
            } else {
                showAlert(`Güncelleme başarısız oldu: ${response.data?.message || 'Bilinmeyen bir hata oluştu.'}`, 'error');
            }
        } catch (error: any) {
            if (axios.isAxiosError(error) && error.response && error.response.status === 401) {
                localStorage.removeItem('authToken');
                navigate("/");
                showAlert('Oturumunuzun süresi doldu veya yetkiniz yok. Lütfen tekrar giriş yapın.', 'error');
            }
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
        setHasUnsavedChanges(true);
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

    const handleFocus = useCallback((event: React.FocusEvent<HTMLInputElement>) => {
        event.target.select();
    }, []);

    // const handleExportExcelPreview = useCallback(() => {
    //     if (!templateWorkbookBuffer) {
    //         showAlert('Excel şablonu henüz yüklenmedi veya yüklenemedi.', 'warning');
    //         return;
    //     }
    //     const workbook = XLSX.read(templateWorkbookBuffer, { type: 'array', cellStyles: true });
    //     const sheetName = workbook.SheetNames[0];
    //     const ws = workbook.Sheets[sheetName];
    //     const startDataRowIndex = 3;
    //     const dataRowsForTemplate = gridData.map(row => [
    //         row.eskiPoz, row.tedasNo, row.anaNo, row.altNo,
    //         row.description, row.olcuBrimi, row.malzeme, row.malzemeYuklenici,
    //         row.montaj, row.demontaj, row.demontajMontaj,
    //         row.birimFiyatMalzeme, row.birimFiyatMontaj, row.birimFiyatDemontaj, row.birimFiyatDemontajMontaj,
    //         row.aciklama,
    //         row.isCategory && row.categoryPercentage !== null ? row.categoryPercentage : '',
    //         row.toplamMalzeme, row.toplamMontaj, row.toplamDemontaj, row.toplamDemontajdanMontaj
    //     ]);
    //     XLSX.utils.sheet_add_aoa(ws, dataRowsForTemplate, { origin: startDataRowIndex, cellStyles: true });
    //     const startRowForTotals = startDataRowIndex + dataRowsForTemplate.length + 1;
    //     const totalSumsOutputRows = [
    //         [...Array(16).fill(''), 'ALT TOPLAM:', totalMalzemeTutariTl, totalMontajTutariTl, totalDemontajTutariTl, totalDmmTutariTl],
    //         [...Array(16).fill(''), 'TOPLAM KEŞİF BEDELİ TL:', totalKesifBedeliTl, '', '', '']
    //     ];
    //     XLSX.utils.sheet_add_aoa(ws, totalSumsOutputRows, { origin: startRowForTotals, cellStyles: true });
    //     const borderStyle = {
    //         top: { style: "thin", color: { auto: 1 } },
    //         bottom: { style: "thin", color: { auto: 1 } },
    //         left: { style: "thin", color: { auto: 1 } },
    //         right: { style: "thin", color: { auto: 1 } },
    //     };
    //     const totalLabelStyle = {
    //         font: { bold: true, color: { rgb: "000000" } },
    //         fill: { fgColor: { rgb: "D9E1F2" } },
    //         alignment: { horizontal: "right", vertical: "center", wrapText: false },
    //         border: borderStyle,
    //     };
    //     const totalAmountStyle = {
    //         font: { bold: true, color: { rgb: "000000" } },
    //         fill: { fgColor: { rgb: "D9E1F2" } },
    //         alignment: { horizontal: "right", vertical: "center", wrapText: false },
    //         border: borderStyle,
    //         numFmt: "#,##0.00"
    //     };
    //     for (let R = 0; R < totalSumsOutputRows.length; R++) {
    //         const currentRowIndexInWorksheet = startRowForTotals + R;
    //         const currentTotalRowData = totalSumsOutputRows[R];
    //         for (let C = 0; C < currentTotalRowData.length; C++) {
    //             const cellAddress = XLSX.utils.encode_cell({ r: currentRowIndexInWorksheet, c: C });
    //             const cellValue = currentTotalRowData[C];
    //             let cell = ws[cellAddress];
    //             if (!cell) { cell = { t: 's', v: cellValue }; ws[cellAddress] = cell; }
    //             if (C === 16) {
    //                 Object.assign(cell.s || (cell.s = {}), totalLabelStyle);
    //                 if (R === 0) {
    //                     Object.assign(cell.s || (cell.s = {}), { alignment: { horizontal: "center", vertical: "center" } });
    //                 }
    //             }
    //             else if (C >= 17 && C <= 20) {
    //                 if (typeof cellValue === 'number') {
    //                     cell.t = 'n';
    //                     Object.assign(cell.s || (cell.s = {}), totalAmountStyle);
    //                 } else {
    //                     Object.assign(cell.s || (cell.s = {}), totalLabelStyle);
    //                 }
    //             }
    //             else {
    //                 Object.assign(cell.s || (cell.s = {}), totalLabelStyle);
    //             }
    //         }
    //     }
    //     const specificMerges = [
    //         { s: { r: 0, c: 0 }, e: { r: 2, c: 0 } },
    //         { s: { r: 0, c: 4 }, e: { r: 2, c: 4 } },
    //         { s: { r: 0, c: 5 }, e: { r: 2, c: 5 } },
    //         { s: { r: 0, c: 15 }, e: { r: 2, c: 15 } },
    //         { s: { r: 0, c: 16 }, e: { r: 2, c: 16 } },
    //         { s: { r: 1, c: 1 }, e: { r: 1, c: 3 } },
    //         { s: { r: 1, c: 6 }, e: { r: 1, c: 10 } },
    //         { s: { r: 1, c: 11 }, e: { r: 1, c: 14 } },
    //         { s: { r: 1, c: 17 }, e: { r: 1, c: 20 } },
    //         { s: { r: startRowForTotals, c: 16 }, e: { r: startRowForTotals, c: 17 } },
    //         { s: { r: startRowForTotals + 1, c: 16 }, e: { r: startRowForTotals + 1, c: 17 } },
    //     ];
    //     ws['!merges'] = (ws['!merges'] || []).concat(specificMerges);
    //     const colWidths = [
    //         { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 30 }, { wch: 10 },
    //         { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 },
    //         { wch: 15 }, { wch: 15 }, { wch: 20 }, { wch: 25 },
    //         { wch: 40 },
    //         { wch: 15 },
    //         { wch: 20 },
    //         { wch: 20 },
    //         { wch: 20 },
    //         { wch: 20 }
    //     ];
    //     ws['!cols'] = colWidths;
    //     XLSX.writeFile(workbook, `İhaleDetayları_${tenderId}_${new Date().toLocaleDateString('tr-TR')}.xlsx`);
    //     showAlert('Excel önizlemesi başarıyla oluşturuldu!', 'success');
    // }, [templateWorkbookBuffer, gridData, totalMalzemeTutariTl, totalMontajTutariTl, totalDemontajTutariTl, totalDmmTutariTl, totalKesifBedeliTl, tenderId, showAlert]);

    // const handleExportExcelPreview = useCallback(async () => {
    //     if (processedAndFilteredGridData.length === 0) {
    //         showAlert('Dışa aktarılacak kayıtlı iş detayı bulunmamaktadır.', 'warning');
    //         return;
    //     }

    //     showAlert('Excel oluşturuluyor...', 'info');

    //     try {
    //         const workbook = new Excel.Workbook();
    //         const worksheet = workbook.addWorksheet('İhale Detayları', {
    //             views: [{ rightToLeft: false }] // نمایش از راست به چپ
    //         });

    //         // تعیین استایل‌های پرکاربرد
    //         const headerFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E1F2' } }; // رنگ خاکستری-آبی
    //         const totalFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2F2F2' } }; // رنگ خاکستری روشن
    //         const headerFont = { bold: true, color: { argb: 'FF000000' } };
    //         const totalFont = { bold: true, color: { argb: 'FF000000' } };
    //         const centerAlignment = { vertical: 'middle', horizontal: 'center' };
    //         const rightAlignment = { vertical: 'middle', horizontal: 'right' };
    //         const thinBorder = { style: 'thin', color: { argb: 'FFD3D3D3' } };
    //         const border = {
    //             top: thinBorder,
    //             left: thinBorder,
    //             bottom: thinBorder,
    //             right: thinBorder
    //         };

    //         // تعریف هدر اصلی و فرعی در قالب آرایه‌های مجزا
    //         const headerRow1 = ['ESKİ POZ', 'YENİ POZ NO', '', '', 'MALZEME VEYA İŞİN CİNSİ', 'ÖLÇÜ BRİMİ', 'MİKTAR', '', '', '', '', 'Birim fiyatlar', '', '', '', 'AÇIKLAMA', '%Kategoriler', 'TUTARLAR', '', '', ''];
    //         const headerRow2 = ['', 'TEDAŞ', 'ANA', 'ALT', '', '', 'MALZEME (GDZ)', 'MALZEME MİKTARI', 'MONTAJ MİKTARI', 'DEMONTAJ MİKTARI', 'DMM MİKTARI', 'MALZEME (TL)', 'MONTAJ (TL)', 'DEMONTAJ (SÖKME) (TL)', 'DEMONTAJDAN MONTAJ (TL)', '', '', 'MALZEME TUTARI-TL', 'MONTAJ TUTARI-TL', 'DEMONTAJ TUTARI-TL', 'DMM TUTARI-TL', ''];

    //         // اضافه کردن هدرها و اعمال استایل
    //         const worksheetHeader1 = worksheet.addRow(headerRow1);
    //         const worksheetHeader2 = worksheet.addRow(headerRow2);
    //         const worksheetHeader3 = worksheet.addRow([]); // یک سطر خالی برای ایجاد فضای مناسب

    //         // ادغام سلول‌های هدر
    //         worksheet.mergeCells('A1:A3');
    //         worksheet.mergeCells('B1:D1');
    //         worksheet.mergeCells('E1:E3');
    //         worksheet.mergeCells('F1:F3');
    //         worksheet.mergeCells('G1:K1');
    //         worksheet.mergeCells('L1:O1');
    //         worksheet.mergeCells('P1:P3');
    //         worksheet.mergeCells('Q1:Q3');
    //         worksheet.mergeCells('R1:U1');
    //         worksheet.mergeCells('B2:D2');
    //         worksheet.mergeCells('G2:K2');
    //         worksheet.mergeCells('L2:O2');
    //         worksheet.mergeCells('R2:U2');

    //         // اعمال استایل به سلول‌های هدر
    //         [worksheetHeader1, worksheetHeader2, worksheetHeader3].forEach(row => {
    //             row.eachCell({ includeEmpty: true }, cell => {
    //                 cell.border = border;
    //                 cell.alignment = centerAlignment;
    //                 cell.font = headerFont;
    //             });
    //         });

    //         // تنظیم عرض ستون‌ها
    //         worksheet.columns = [
    //             { width: 10 }, { width: 10 }, { width: 10 }, { width: 10 }, { width: 30 }, { width: 10 },
    //             { width: 15 }, { width: 15 }, { width: 15 }, { width: 15 }, { width: 15 },
    //             { width: 15 }, { width: 15 }, { width: 20 }, { width: 25 },
    //             { width: 40 }, { width: 15 },
    //             { width: 20 }, { width: 20 }, { width: 20 }, { width: 20 }
    //         ];

    //         // ایجاد و اضافه کردن ردیف‌های داده
    //         const startDataRowIndex = 4;
    //         processedAndFilteredGridData.forEach((row, index) => {
    //             const newRow = [
    //                 row.eskiPoz, row.tedasNo, row.anaNo, row.altNo, row.description, row.olcuBrimi,
    //                 row.malzeme, row.malzemeYuklenici, row.montaj, row.demontaj, row.demontajMontaj,
    //                 row.birimFiyatMalzeme, row.birimFiyatMontaj, row.birimFiyatDemontaj, row.birimFiyatDemontajMontaj,
    //                 row.aciklama, row.isCategory && row.categoryPercentage !== null ? row.categoryPercentage : '',
    //                 row.toplamMalzeme, row.toplamMontaj, row.toplamDemontaj, row.toplamDemontajdanMontaj
    //             ];
    //             worksheet.addRow(newRow);

    //             // اعمال استایل به هر سلول از ردیف داده
    //             const currentRow = worksheet.getRow(startDataRowIndex + index);
    //             currentRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
    //                 cell.border = border;
    //                 cell.alignment = { vertical: 'top', horizontal: 'center', wrapText: true };

    //                 if (colNumber > 17 && colNumber < 22) { // ستون‌های TUTARLAR
    //                     cell.numFmt = '#,##0.00';
    //                     cell.alignment = rightAlignment;
    //                 } else if (colNumber === 5 || colNumber === 16) { // ستون‌های Description و Açıklama
    //                     cell.alignment = { ...cell.alignment, horizontal: 'right' };
    //                 }
    //             });
    //         });

    //         // اضافه کردن سطر جمع کل
    //         const totalRowIndex = worksheet.lastRow.number + 2;
    //         const totalRow1 = worksheet.addRow([]);
    //         const totalRow2 = worksheet.addRow([]);
    //         worksheet.mergeCells(`P${totalRowIndex}:Q${totalRowIndex}`);
    //         worksheet.mergeCells(`P${totalRowIndex + 1}:Q${totalRowIndex + 1}`);

    //         // پر کردن و استایل‌دهی سطر جمع کل
    //         const totalLabelCell1 = worksheet.getCell(`P${totalRowIndex}`);
    //         const totalLabelCell2 = worksheet.getCell(`P${totalRowIndex + 1}`);
    //         totalLabelCell1.value = 'ALT TOPLAM:';
    //         totalLabelCell2.value = 'TOPLAM KEŞİF BEDELİ TL:';

    //         [totalRow1, totalRow2].forEach(row => {
    //             row.eachCell({ includeEmpty: true }, cell => {
    //                 cell.border = border;
    //                 cell.font = totalFont;
    //                 cell.fill = totalFill;
    //                 cell.alignment = rightAlignment;
    //             });
    //         });

    //         // تنظیم مقادیر عددی و فرمت‌دهی سطر جمع کل
    //         worksheet.getCell(`R${totalRowIndex}`).value = totalMalzemeTutariTl;
    //         worksheet.getCell(`S${totalRowIndex}`).value = totalMontajTutariTl;
    //         worksheet.getCell(`T${totalRowIndex}`).value = totalDemontajTutariTl;
    //         worksheet.getCell(`U${totalRowIndex}`).value = totalDmmTutariTl;
    //         worksheet.getCell(`R${totalRowIndex + 1}`).value = totalKesifBedeliTl;

    //         worksheet.getCell(`R${totalRowIndex}`).numFmt = '#,##0.00';
    //         worksheet.getCell(`S${totalRowIndex}`).numFmt = '#,##0.00';
    //         worksheet.getCell(`T${totalRowIndex}`).numFmt = '#,##0.00';
    //         worksheet.getCell(`U${totalRowIndex}`).numFmt = '#,##0.00';
    //         worksheet.getCell(`R${totalRowIndex + 1}`).numFmt = '#,##0.00';

    //         // ذخیره فایل
    //         const buffer = await workbook.xlsx.writeBuffer();
    //         const fileName = `İhaleDetayları_${tenderId}_${new Date().toLocaleDateString('tr-TR')}.xlsx`;
    //         saveAs(new Blob([buffer]), fileName);

    //         showAlert('Excel başarıyla dışa aktarıldı!', 'success');
    //     } catch (error) {
    //         console.error("Excel dışa aktarılırken hata:", error);
    //         showAlert('Excel dışa aktarılırken bir hata oluştu. Lütfen konsolu kontrol edin.', 'error');
    //     }
    // }, [processedAndFilteredGridData, totalMalzemeTutariTl, totalMontajTutariTl, totalDemontajTutariTl, totalDmmTutariTl, totalKesifBedeliTl, tenderId, showAlert]);


    const handleExportExcelPreview = useCallback(async () => {
        if (processedAndFilteredGridData.length === 0) {
            showAlert('Dışa aktarılacak kayıtlı iş detayı bulunmamaktadır.', 'warning');
            return;
        }

        showAlert('Excel oluşturuluyor...', 'info');

        try {
            const workbook = new Excel.Workbook();
            const worksheet = workbook.addWorksheet('İhale Detayları', {
                views: [{ rightToLeft: false }]
            });

            const thinBorder: Partial<Excel.Border> = {
                style: 'thin',
                color: { argb: 'FFD3D3D3' }
            };

            const border: Partial<Excel.Borders> = {
                top: thinBorder,
                left: thinBorder,
                bottom: thinBorder,
                right: thinBorder
            };

            const headerFill: Partial<Excel.Fill> = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFD9E1F2' }
            };

            const subHeaderFill: Partial<Excel.Fill> = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFEDEDED' }
            };

            const font: Partial<Excel.Font> = {
                name: 'Calibri',
                size: 11,
                bold: false,
                color: { argb: 'FF000000' }
            };

            const headerFont: Partial<Excel.Font> = { ...font, bold: true };
            const subHeaderFont: Partial<Excel.Font> = { ...font, bold: true };

            const centerAlignment: Partial<Excel.Alignment> = {
                vertical: 'middle',
                horizontal: 'center',
                wrapText: true
            };

            const leftAlignment: Partial<Excel.Alignment> = {
                vertical: 'middle',
                horizontal: 'left',
                wrapText: true
            };

            const rightAlignment: Partial<Excel.Alignment> = {
                vertical: 'middle',
                horizontal: 'right',
                wrapText: true
            };

            const numberFormat: string = '#,##0.00';
            const percentFormat: string = '0.00';


            const fullHeaderStyle = {
                border: border,
                alignment: centerAlignment,
                font: headerFont,
                fill: headerFill
            } as Partial<Excel.Style>;

            const fullSubHeaderStyle = {
                border: border,
                alignment: centerAlignment,
                font: subHeaderFont,
                fill: subHeaderFill
            } as Partial<Excel.Style>;


            // --- ساختار هدرها ---
            const h1 = ['ESKİ POZ', 'YENİ POZ NO', '', '', 'MALZEME VEYA İŞİN CİNSİ', 'ÖLÇÜ BRİMİ', 'MİKTAR', '', '', '', '', 'Birim fiyatlar', '', '', '', 'AÇIKLAMA', '%Kategoriler', 'TUTARLAR', '', '', ''];
            const h2 = ['', 'TEDAŞ', 'ANA', 'ALT', '', '', 'MALZEME (GDZ)', 'MALZEME MİKTARI', 'MONTAJ MİKTARI', 'DEMONTAJ MİKTARI', 'DMM MİKTARI', 'MALZEME (TL)', 'MONTAJ (TL)', 'DEMONTAJ (SÖKME) (TL)', 'DEMONTAJDAN MONTAJ (TL)', '', '', 'MALZEME TUTARI-TL', 'MONTAJ TUTARI-TL', 'DEMONTAJ TUTARI-TL', 'DMM TUTARI-TL', ''];

            const worksheetHeader1 = worksheet.addRow(h1);
            const worksheetHeader2 = worksheet.addRow(h2);

            // --- اعمال Merge و استایل‌دهی به هدرها ---
            worksheet.mergeCells('A1:A2');
            worksheet.mergeCells('B1:D1');
            worksheet.mergeCells('E1:E2');
            worksheet.mergeCells('F1:F2');
            worksheet.mergeCells('G1:K1');
            worksheet.mergeCells('L1:O1');
            worksheet.mergeCells('P1:P2');
            worksheet.mergeCells('Q1:Q2');
            worksheet.mergeCells('R1:U1');

            // اعمال استایل به تمام سلول‌های هدر
            worksheetHeader1.eachCell({ includeEmpty: true }, (cell) => {
                Object.assign(cell.style, fullHeaderStyle);
            });
            worksheetHeader2.eachCell({ includeEmpty: true }, (cell) => {
                Object.assign(cell.style, fullSubHeaderStyle);
            });

            // تنظیم عرض ستون‌ها
            worksheet.columns = [
                { width: 10 }, { width: 10 }, { width: 10 }, { width: 10 },
                { width: 30 }, { width: 10 },
                { width: 15 }, { width: 15 }, { width: 15 }, { width: 15 }, { width: 15 },
                { width: 15 }, { width: 15 }, { width: 20 }, { width: 25 },
                { width: 40 }, { width: 15 },
                { width: 20 }, { width: 20 }, { width: 20 }, { width: 20 }
            ];

            processedAndFilteredGridData.forEach((row, _index) => {
                const newRow = [
                    row.eskiPoz, row.tedasNo, row.anaNo, row.altNo, row.description, row.olcuBrimi,
                    row.malzeme, row.malzemeYuklenici, row.montaj, row.demontaj, row.demontajMontaj,
                    row.birimFiyatMalzeme, row.birimFiyatMontaj, row.birimFiyatDemontaj, row.birimFiyatDemontajMontaj,
                    row.aciklama, row.isCategory && row.categoryPercentage !== null ? row.categoryPercentage : '',
                    row.toplamMalzeme, row.toplamMontaj, row.toplamDemontaj, row.toplamDemontajdanMontaj
                ];
                const worksheetRow = worksheet.addRow(newRow);

                worksheetRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
                    cell.style = { border: border, font: font, alignment: { wrapText: true, vertical: 'top', horizontal: 'center' } };

                    if (colNumber > 17 && colNumber <= 21) {
                        cell.numFmt = numberFormat;
                        cell.alignment = rightAlignment;
                    } else if (colNumber === 17) {
                        cell.numFmt = percentFormat;
                        cell.alignment = centerAlignment;
                    } else if (colNumber === 5 || colNumber === 16) {
                        cell.alignment = leftAlignment;
                    }
                });
            });

            // --- اضافه کردن سطر جمع کل ---
            const lastDataRowNumber = worksheet.lastRow?.number || 0;
            const totalRowIndex = lastDataRowNumber + 2;
            const totalRow1 = worksheet.getRow(totalRowIndex);
            const totalRow2 = worksheet.getRow(totalRowIndex + 1);

            totalRow1.getCell(16).value = 'ALT TOPLAM:';
            totalRow2.getCell(16).value = 'TOPLAM KEŞİF BEDELİ TL:';
            totalRow1.getCell(18).value = totalMalzemeTutariTl;
            totalRow1.getCell(19).value = totalMontajTutariTl;
            totalRow1.getCell(20).value = totalDemontajTutariTl;
            totalRow1.getCell(21).value = totalDmmTutariTl;
            totalRow2.getCell(18).value = totalKesifBedeliTl;

            worksheet.mergeCells(`P${totalRow1.number}:Q${totalRow1.number}`);
            worksheet.mergeCells(`P${totalRow2.number}:Q${totalRow2.number}`);
            worksheet.mergeCells(`R${totalRow2.number}:U${totalRow2.number}`);

            // [totalRow1, totalRow2].forEach(row => {
            //     row.eachCell({ includeEmpty: true }, cell => {
            //         cell.style = {
            //             border: border,
            //             font: headerFont,
            //             fill: headerFill,
            //             alignment: rightAlignment
            //         };
            //         if (cell.col >= 18 && cell.col <= 21) {
            //             cell.numFmt = numberFormat;
            //         }
            //     });
            // });

            [totalRow1, totalRow2].forEach(row => {
                row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
                    cell.style = {
                        border: border,
                        font: headerFont,
                        fill: headerFill as Excel.Fill,
                        alignment: rightAlignment
                    };
                    // از colNumber به جای cell.col استفاده کنید
                    if (colNumber > 17 && colNumber <= 21) {
                        cell.numFmt = numberFormat;
                    }
                });
            });

            // --- ذخیره فایل ---
            const buffer = await workbook.xlsx.writeBuffer();
            const fileName = `İhaleDetayları_${tenderId}_${new Date().toLocaleDateString('tr-TR')}.xlsx`;
            saveAs(new Blob([buffer]), fileName);

            showAlert('Excel başarıyla dışa aktarıldı!', 'success');
        } catch (error) {
            console.error("Excel dışa aktarılırken hata:", error);
            showAlert('Excel dışa aktarılırken bir hata oluştu. Lütfen konsolu kontrol edin.', 'error');
        }
    }, [processedAndFilteredGridData, totalMalzemeTutariTl, totalMontajTutariTl, totalDemontajTutariTl, totalDmmTutariTl, totalKesifBedeliTl, tenderId, showAlert]);


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
            if (node.type === 'item') {
                onSelect(node);
            } else if (node.type === 'category' && node.children && node.children.length > 0) {
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
                        pointerEvents: node.type === 'category' && node.children.length === 0 ? 'none' : 'auto',
                    }}
                    disabled={node.type === 'category' && node.children.length === 0}
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
                                onChange={handleSelection}
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

            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
                <Stack direction="row" mb={4} spacing={1} flexWrap="wrap">
                    <Chip
                        label={`İhale: ${tenderTitle}`}
                        color="primary"
                        variant="filled"
                        size="small"
                    />
                </Stack>

                <CustomTooltip title={isTooltipGloballyEnabled ? "Geri dön" : ""}>
                    <Button variant="outlined" color="error" onClick={() => navigate(-1)}
                        endIcon={<IconArrowRight size={20} />}>
                        Geri Dön
                    </Button>
                </CustomTooltip>
            </Stack>
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
                        <Stack
                            direction={{ xs: 'column', sm: 'row' }}
                            spacing={1}
                            alignItems="flex-start"
                            sx={{ mb: 1 }}
                        >
                            <CustomTooltip title={isTooltipGloballyEnabled ? "Excel dosyasını (.xlsx, .xls veya .csv) yükle" : ""}>
                                <Button
                                    variant="contained"
                                    component="label"
                                    onClick={() => fileInputRef.current?.click()}
                                    startIcon={<IconCloudUpload />}
                                    sx={{ width: { xs: '100%', sm: 'auto' } }}
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
                                    sx={{ width: { xs: '100%', sm: 'auto' } }}
                                    disabled={loading || isSavingAll || editingRowId !== null || isLoading}
                                >
                                    Şablonu İndir
                                </Button>
                            </CustomTooltip>
                            {loading && (
                                <Box sx={{ display: 'flex', alignItems: 'center', ml: { xs: 0, sm: 2 }, mt: { xs: 1, sm: 0 } }}>
                                    <CircularProgress size={20} />
                                </Box>
                            )}
                            {fileUploadedSuccessfully && !loading && (
                                <CustomTooltip title="Dosya başarıyla yüklendi!">
                                    <IconCheck style={{ color: theme.palette.success.main, marginLeft: theme.spacing(1) }} />
                                </CustomTooltip>
                            )}
                        </Stack>
                        <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
                            Lütfen Excel dosyanızı (.xlsx, .xls veya .csv) buraya yükleyin.
                        </Typography>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        <Stack
                            direction={{ xs: 'column', sm: 'row' }}
                            spacing={1}
                            justifyContent="flex-end"
                            alignItems={{ xs: 'stretch', sm: 'flex-end' }}
                        >
                            {/* <Button
                                variant="contained"
                                color="primary"
                                onClick={handleSaveAllData}
                                disabled={isLoading || isSavingAll || editingRowId !== null || gridData.length === 0 || hasUnregisteredItems}
                                startIcon={isSavingAll ? <CircularProgress size={20} color="inherit" /> : <IconCheck />}
                                sx={{ minWidth: { xs: '100%', sm: 150 }, height: 40 }}
                            >
                                {isSavingAll ? 'Kaydediliyor...' : 'Tümünü Kaydet'}
                            </Button> */}


                            <Box
                                sx={{
                                    position: 'fixed',
                                    bottom: 100,
                                    right: 24,
                                    zIndex: 1000,
                                    display: hasUnsavedChanges ? 'block' : 'none',
                                    '& .blinking-button': {
                                        animation: `${blinkAnimation} 1.5s infinite`,
                                        '&:hover': {
                                            animation: 'none',
                                        },
                                    },
                                }}
                            >
                                <CustomTooltip title={isTooltipGloballyEnabled ? "Değişiklikleriniz kaydedilmedi. Son kaydetme işlemi için bu butona tıklayın." : ""}>
                                    <Button
                                        className="blinking-button"
                                        variant="contained"
                                        color="error"
                                        onClick={handleSaveAllData}
                                        disabled={isLoading || isSavingAll || editingRowId !== null || gridData.length === 0 || hasUnregisteredItems}
                                        startIcon={isSavingAll ? <CircularProgress size={20} color="inherit" /> : <IconCheck />}
                                    >
                                        {isSavingAll ? 'Kaydediliyor...' : 'Tümünü Kaydet'}
                                    </Button>
                                </CustomTooltip>
                            </Box>
                            <CustomTooltip title={isTooltipGloballyEnabled ? "Tabloyu Excel olarak dışa aktar" : ""}>
                                <Button
                                    variant="outlined"
                                    color="secondary"
                                    onClick={handleExportExcelPreview}
                                    disabled={isLoading || isSavingAll || editingRowId !== null || gridData.length === 0}
                                    startIcon={<IconFileExport />}
                                    sx={{ minWidth: { xs: '100%', sm: 150 }, height: 40 }}
                                >
                                    Excel Dışa Aktar
                                </Button>
                            </CustomTooltip>
                        </Stack>
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
                    <Grid item xs={12} sm={6}>
                        <Stack
                            direction={{ xs: 'column', sm: 'row' }}
                            spacing={1}
                            justifyContent={{ xs: 'flex-start', sm: 'flex-end' }}
                            alignItems={{ xs: 'stretch', sm: 'flex-end' }}
                            sx={{ width: '100%', pt: { xs: 2, sm: 0 } }}
                        >
                            <Button
                                variant={displayMode === 'withoutCategory' ? 'contained' : 'outlined'}
                                onClick={() => setDisplayMode('withoutCategory')}
                                disabled={isLoading || isSavingAll || editingRowId !== null}
                                size="small"
                                sx={{ width: { xs: '100%', sm: 'auto' } }}
                            >
                                Kategorisiz Görüntüle
                            </Button>
                            <Button
                                variant={displayMode === 'withCategory' ? 'contained' : 'outlined'}
                                onClick={() => setDisplayMode('withCategory')}
                                disabled={isLoading || isSavingAll || editingRowId !== null}
                                size="small"
                                sx={{ width: { xs: '100%', sm: 'auto' } }}
                            >
                                Kategorilerle Görüntüle
                            </Button>
                        </Stack>
                    </Grid>
                </Grid>
            </Paper>
            {
                alertMessage && (
                    <Stack sx={{ width: '100%', mb: 2 }} spacing={2}>
                        <Alert severity={alertSeverity} onClose={clearAlert}>
                            {alertMessage}
                        </Alert>
                    </Stack>
                )
            }
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
                                    <TableCell align="center" sx={{ minWidth: 100 }}>MALZEME (GDZ)</TableCell>
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
                                            onFocus={handleFocus}
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
                                            onFocus={handleFocus}
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
                                            onFocus={handleFocus}
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
                                                onChange={() => { }}
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
                                    <TableCell>
                                        <CustomTextField
                                            id="new-malzeme"
                                            name="malzeme"
                                            type="text"
                                            size="small"
                                            value={formatInputNumberForDisplay(newRecordRow.malzeme, 0)}
                                            onChange={handleNewRecordInputChange}
                                            onFocus={handleFocus}
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
                                            onFocus={handleFocus}
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
                                            disabled={true}
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
                                            onFocus={handleFocus}
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
                                            onFocus={handleFocus}
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
                                            // value={birimFiyatMalzemeNew}
                                            value={newRecordRow.birimFiyatMalzeme}
                                            onFocus={handleFocus}
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
                                            value={newRecordRow.birimFiyatMontaj}
                                            // value={birimFiyatMontajNew}
                                            onChange={handleNewRecordInputChange}
                                            onFocus={handleFocus}
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
                                            // value={birimFiyatDemontajNew}
                                            value={newRecordRow.birimFiyatDemontaj}
                                            onChange={handleNewRecordInputChange}
                                            onFocus={handleFocus}
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
                                            // value={birimFiyatDemontajMontajNew}
                                            value={newRecordRow.birimFiyatDemontajMontaj}
                                            onChange={handleNewRecordInputChange}
                                            onFocus={handleFocus}
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
                                            value={isSelectedNodeAnItem ? formatInputNumberForDisplay(newRecordRow.categoryPercentage, 2) : ''}
                                            onChange={handleNewRecordInputChange}
                                            onFocus={handleFocus}
                                            sx={{ width: 90, '& input': { textAlign: 'center' } }}
                                            // اینجا شرط فعال/غیرفعال بودن را تغییر می‌دهیم
                                            disabled={!isSelectedNodeAnItem || hasParentCategoryPercentage || loading || isSavingAll || isLoading}
                                            placeholder={isSelectedNodeAnItem ? "%n" : ""}
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
                                            disabled={true}
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
                                            disabled={true}
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
                                            disabled={true}
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
                                            disabled={true}
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
                                                            onChange={() => { }}
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
                                                        disabled={editingRowData?.isCategory}
                                                    />
                                                ) : (
                                                    <Typography variant="body2" sx={{ textAlign: 'center' }}>{row.olcuBrimi}</Typography>
                                                )}
                                            </TableCell>
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
                                                        disabled={true}
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
                                                        placeholder={editingRowData?.isCategory ? "%n" : ""}
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
                                                        disabled={true}
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
                                                        disabled={true}
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
                                                        disabled={true}
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
                                                        disabled={true}
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
            {
                itemToRegister && (
                    <RegisterUnregisteredItemModal
                        open={openRegisterItemModal}
                        onClose={handleCloseRegisterItemModal}
                        onRegisterSuccess={handleRegistrationSuccess}
                        initialData={itemToRegister}
                        showAlert={showAlert}
                    />
                )
            }
            {
                categoryToRegister && (
                    <RegisterUnregisteredCategoryModal
                        open={openRegisterCategoryModal}
                        onClose={handleCloseRegisterCategoryModal}
                        onRegisterSuccess={handleRegistrationSuccess}
                        initialData={categoryToRegister}
                        showAlert={showAlert}
                    />
                )
            }
            <Backdrop
                sx={{ color: '#fff', zIndex: (theme) => theme.zIndex.drawer + 1 }}
                open={isLoading}
            >
                <CircularProgress color="inherit" />
            </Backdrop>
        </Box >
    );
};

export default TenderDetails;