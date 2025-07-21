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


interface TenderDetailRow {
    id: number;
    siraNo: number;
    eskiPoz: string;

    tedasNo: number;
    anaNo: number;
    altNo: number;

    description: string;
    olcuBrimi: string;

    malzeme: number; // NEW: Added MALZEME as a separate numeric field (not quantity)
    malzemeYuklenici: number; // MALZEME MİKTARI
    montaj: number; // MONTAJ MİKTARI (Calculated: MALZEME + MALZEME MİKTARI)
    demontaj: number; // DEMONTAJ MİKTARI
    demontajMontaj: number; // DMM MİKTARI

    birimFiyatMalzeme: number;
    birimFiyatMontaj: number;
    birimFiyatDemontaj: number;
    birimFiyatDemontajMontaj: number;

    aciklama: string;
    categoryPercentage: number | null; // NEW: For %Kategoriler, can be null or a number
    isCategory: boolean; // NEW: To distinguish categories from items for %Kategoriler column

    toplamMalzeme: number;
    toplamMontaj: number;
    toplamDemontaj: number;
    toplamDemontajdanMontaj: number;

    isUnregisteredItem: boolean;
    itemId: number | null;
    isFromExcel: boolean; // **NEW: Flag to indicate if the row came directly from an Excel import**
}

export interface ApiCategoryType {
    id: string; // <-- این هم باید string باشد
    name: string;
    parentId: string | null;
    categories: ApiCategoryType[];
    depth?: number;
}

interface ApiItemType {
    id: number;
    name: string;
    category: { id: string; name?: string; };
    unit: { title: string; };
}

interface UnifiedTreeNode {
    id: string;
    name: string;
    type: 'category' | 'item';
    depth: number;
    children: UnifiedTreeNode[];
    originalData?: ApiItemType;
}

interface GetTenderByIdRawResponse {
    success: boolean;
    httpStatusCode: number;
    httpStatusCodeName: string;
    message: string;
    data: {
        id: number;
        title: string;
        createAt: string;
        recordStatus: number;
        status: number;
        statusDate: string;
        tenderDetails: ApiTenderDetailItem[];
    };
    errors: any[];
}

interface ApiTenderDetailItem {
    id: number;
    firmProcuredItemQuantities: number; // Used for 'MALZEME' value
    ourProcuredItemQuantities: number;
    demontaj: number;
    demontajMontaj: number;
    firmProcuredItemPrice: string | number;
    ourProcuredItemPrice: string | number;
    montajPrice: string | number;
    demontajPrice: string | number;
    demontajMontajPrice: string | number;
    recordStatus: number;
    createAt: string;
    item: {
        id: number;
        name: string;
        description: string;
        abbreviation: string;
        recordStatus: number;
        createAt: string;
        category: { id: string; name?: string; };
        unit: { id: string; title: string; recordStatus: number; createAt: string; };
    };
    tedasNo?: number | string;
    anaNo?: number | string;
    altNo?: number | string;
    montajQuantity?: number | string;
    aciklama?: string;
    eskiPoz?: string;
    toplamMalzeme?: number | string;
    toplamMontaj?: number | string;
    toplamDemontaj?: number | string;
    toplamDemontajdanMontaj?: number | string;
    categoryPercentage?: number | string; // NEW: Added to API response interface
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
        } as UnifiedTreeNode;
    }).sort((a, b) => a.name.localeCompare(b.name));
};


const findNodePath = (nodes: UnifiedTreeNode[], targetId: string, currentPath: UnifiedTreeNode[] = []): UnifiedTreeNode[] => {
    for (const node of nodes) {
        const newPath = [...currentPath, node];
        if (node.id === targetId) {
            return newPath;
        }
        if (node.children && node.children.length > 0) {
            const foundPath = findNodePath(node.children, targetId, newPath);
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

const parseAndCleanFloat = (value: string | number): number => {
    if (typeof value === 'number') {
        return value;
    }
    let cleanedValue = String(value).replace(/,/g, '.'); // Convert comma to dot

    // Handle multiple dots by keeping only the first one
    const parts = cleanedValue.split('.');
    if (parts.length > 2) {
        cleanedValue = parts[0] + '.' + parts.slice(1).join('');
    }

    // Remove any non-numeric characters except for the dot
    cleanedValue = cleanedValue.replace(/[^0-9.]/g, '');

    const parsed = parseFloat(cleanedValue);
    return isNaN(parsed) ? 0 : parsed;
};

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

    const [gridSearchTerm, setGridSearchTerm] = useState<string>('');

    const initialDisplayLimit = 30;
    const loadMoreStep = 5;

    const [currentDisplayCount, setCurrentDisplayCount] = useState(initialDisplayLimit);
    const [hasMoreData, setHasMoreData] = useState(true);

    // Original state for new record (holding numbers)
    const [newRecordRow, setNewRecordRow] = useState<TenderDetailRow>({
        id: 0,
        siraNo: 0,
        eskiPoz: '',
        tedasNo: 0,
        anaNo: 0,
        altNo: 0,
        description: '',
        olcuBrimi: '',
        malzeme: 0, // NEW
        malzemeYuklenici: 0,
        montaj: 0, // Calculated
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
        aciklama: '',
        categoryPercentage: null, // NEW
        isCategory: false, // NEW
        isFromExcel: false, // NEW: Default to false for new manual entries
    });

    // States for raw string input for NEW record Birim Fiyatlar
    const [birimFiyatMalzemeNew, setBirimFiyatMalzemeNew] = useState<string>("0");
    const [birimFiyatMontajNew, setBirimFiyatMontajNew] = useState<string>("0");
    const [birimFiyatDemontajNew, setBirimFiyatDemontajNew] = useState<string>("0");
    const [birimFiyatDemontajMontajNew, setBirimFiyatDemontajMontajNew] = useState<string>("0");

    // States for raw string input for EDITING record Birim Fiyatlar
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
        const path = findNodePath(combinedTreeData, newRecordSelectedUnifiedNodeId);
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
        const path = findNodePath(combinedTreeData, editingRowSelectedUnifiedNodeId);
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


    const findNodeById = (nodes: UnifiedTreeNode[], id: string): UnifiedTreeNode | undefined => {
        for (const node of nodes) {
            if (node.id === id) {
                return node;
            }
            if (node.children && node.children.length > 0) {
                const found = findNodeById(node.children, id);
                if (found) return found;
            }
        }
        return undefined;
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

    const findNodeByNameAndType = (nodes: UnifiedTreeNode[], normalizedSearchName: string, type: 'category' | 'item'): UnifiedTreeNode | undefined => {
        for (const node of nodes) {
            const normalizedNodeName = normalizeString(node.name);

            if (normalizedNodeName === normalizedSearchName && node.type === type) {
                return node;
            }
            if (node.children && node.children.length > 0) {
                const found = findNodeByNameAndType(node.children, normalizedSearchName, type);
                if (found) return found;
            }
        }
        return undefined;
    };


    const calculateTotals = useCallback((
        row: Partial<TenderDetailRow>,
        forceRecalculate: boolean = false // Added flag to force recalculation
    ): TenderDetailRow => {
        // If the row is flagged as from Excel and we are not explicitly forcing recalculation,
        // then use its existing toplam values.
        if (row.isFromExcel && !forceRecalculate) {
            return {
                id: row.id ?? 0,
                siraNo: row.siraNo ?? 0,
                eskiPoz: row.eskiPoz ?? '',
                tedasNo: row.tedasNo ?? 0,
                anaNo: row.anaNo ?? 0,
                altNo: row.altNo ?? 0,
                description: row.description ?? '',
                olcuBrimi: row.olcuBrimi ?? '',
                malzeme: row.malzeme ?? 0,
                malzemeYuklenici: row.malzemeYuklenici ?? 0,
                montaj: (row.malzeme ?? 0) + (row.malzemeYuklenici ?? 0), // Montaj quantity is still derived
                demontaj: row.demontaj ?? 0,
                demontajMontaj: row.demontajMontaj ?? 0,
                birimFiyatMalzeme: row.birimFiyatMalzeme ?? 0,
                birimFiyatMontaj: row.birimFiyatMontaj ?? 0,
                birimFiyatDemontaj: row.birimFiyatDemontaj ?? 0,
                birimFiyatDemontajMontaj: row.birimFiyatDemontajMontaj ?? 0,
                aciklama: row.aciklama ?? '',
                categoryPercentage: row.categoryPercentage ?? null,
                isCategory: row.isCategory ?? false,
                isUnregisteredItem: row.isUnregisteredItem ?? false,
                itemId: row.itemId ?? null,
                isFromExcel: row.isFromExcel ?? false,
                toplamMalzeme: row.toplamMalzeme ?? 0, // Preserve original Excel values
                toplamMontaj: row.toplamMontaj ?? 0,
                toplamDemontaj: row.toplamDemontaj ?? 0,
                toplamDemontajdanMontaj: row.toplamDemontajdanMontaj ?? 0,
            };
        }

        // Proceed with normal calculation if not from Excel OR if forceRecalculate is true
        const malzeme = row.malzeme ?? 0;
        const malzemeMiktari = row.malzemeYuklenici ?? 0;
        const montajMiktari = malzeme + malzemeMiktari; // This is a quantity, always calculated

        const demontajMiktari = row.demontaj ?? 0;
        const dmmMiktari = row.demontajMontaj ?? 0;

        const birimFiyatMalzeme = row.birimFiyatMalzeme ?? 0;
        const birimFiyatMontaj = row.birimFiyatMontaj ?? 0;
        const birimFiyatDemontaj = row.birimFiyatDemontaj ?? 0;
        const birimFiyatDemontajMontaj = row.birimFiyatDemontajMontaj ?? 0;

        let percentageFactor = 1;
        // Apply %n only if the row is NOT a category and its parent category has a percentage
        // or if the row *is* a category and has its own percentage.
        if (row.isCategory) { // If it's a category, use its own percentage
            percentageFactor = (row.categoryPercentage ?? 100) / 100;
        } else if (row.categoryPercentage !== null && row.categoryPercentage !== undefined) { // If it's an item and has a parent category percentage
             percentageFactor = row.categoryPercentage / 100;
        }


        const calculatedToplamMalzeme = malzemeMiktari * birimFiyatMalzeme; // NO percentage for MALZEME
        const calculatedToplamMontaj = montajMiktari * birimFiyatMontaj;     // NO percentage for MONTAJ
        const calculatedToplamDemontaj = demontajMiktari * birimFiyatDemontaj * percentageFactor;
        const calculatedToplamDemontajdanMontaj = dmmMiktari * birimFiyatDemontajMontaj * percentageFactor;

        return {
            id: row.id ?? 0,
            siraNo: row.siraNo ?? 0,
            eskiPoz: row.eskiPoz ?? '',
            tedasNo: row.tedasNo ?? 0,
            anaNo: row.anaNo ?? 0,
            altNo: row.altNo ?? 0,
            description: row.description ?? '',
            olcuBrimi: row.olcuBrimi ?? '',
            malzeme: malzeme,
            malzemeYuklenici: malzemeMiktari,
            montaj: montajMiktari,
            demontaj: demontajMiktari,
            demontajMontaj: dmmMiktari,
            birimFiyatMalzeme: birimFiyatMalzeme,
            birimFiyatMontaj: birimFiyatMontaj,
            birimFiyatDemontaj: birimFiyatDemontaj,
            birimFiyatDemontajMontaj: birimFiyatDemontajMontaj,
            toplamMalzeme: calculatedToplamMalzeme,
            toplamMontaj: calculatedToplamMontaj,
            toplamDemontaj: calculatedToplamDemontaj,
            toplamDemontajdanMontaj: calculatedToplamDemontajdanMontaj,
            isUnregisteredItem: row.isUnregisteredItem ?? false,
            itemId: row.itemId ?? null,
            aciklama: row.aciklama ?? '',
            categoryPercentage: row.categoryPercentage ?? null,
            isCategory: row.isCategory ?? false,
            isFromExcel: row.isFromExcel ?? false, // Keep the flag consistent
        } as TenderDetailRow;
    }, []);


    const processedAndFilteredGridData = useMemo(() => {
        let currentData = [...gridData];

        // First, create a map of category percentages for quick lookup
        const categoryPercentagesMap = new Map<string, number | null>();
        gridData.forEach(row => {
            if (row.isCategory && row.categoryPercentage !== null) {
                categoryPercentagesMap.set(normalizeString(row.description), row.categoryPercentage);
            }
        });

        // Apply category percentages to items and recalculate totals if needed
        currentData = currentData.map(row => {
            let updatedRow = { ...row };
            
            // This part updates categoryPercentage based on parent category mapping
            // It will trigger recalculation if the percentage changes.
            if (!row.isCategory && row.itemId !== null && combinedTreeData.length > 0) {
                const itemNode = findNodeById(combinedTreeData, `item-${row.itemId}`);
                if (itemNode && itemNode.originalData?.category?.id) {
                    const parentCategoryNode = findNodePath(combinedTreeData, `cat-${itemNode.originalData.category.id}`).find(n => n.type === 'category');
                    if (parentCategoryNode) {
                        const normalizedCategoryName = normalizeString(parentCategoryNode.name);
                        const categoryPct = categoryPercentagesMap.get(normalizedCategoryName);
                        if (categoryPct !== undefined && updatedRow.categoryPercentage !== categoryPct) {
                            updatedRow.categoryPercentage = categoryPct;
                            // When category percentage changes for an item, force recalculation of its totals.
                            // Even if it was from Excel, the percentage changed, so its totals need update.
                            return calculateTotals(updatedRow, true); 
                        }
                    }
                }
            }
            // If the row's category percentage (for items) didn't change,
            // or if it's a category, or if it's not linked to a category,
            // simply call calculateTotals without forcing recalculation.
            // calculateTotals will handle `isFromExcel` internally.
            return calculateTotals(updatedRow, false); // Do not force, let calculateTotals decide based on isFromExcel
        });

        // --- CRITICAL CHANGE FOR ORDER ---
        if (displayMode === 'withoutCategory') {
            currentData = currentData.filter(row => !row.isCategory);
        }

        let currentSiraNo = 1;
        currentData = currentData.map(row => ({
            ...row,
            siraNo: currentSiraNo++
        }));
        // --- END CRITICAL CHANGE ---

        if (!gridSearchTerm) {
            return currentData;
        }
        const lowerCaseSearchTerm = gridSearchTerm.toLowerCase();
        return currentData.filter(row =>
            row.description.toLowerCase().includes(lowerCaseSearchTerm) ||
            row.aciklama.toLowerCase().includes(lowerCaseSearchTerm)
        );
    }, [gridData, displayMode, gridSearchTerm, combinedTreeData, calculateTotals]);


    const displayedGridData = useMemo(() => {
        return processedAndFilteredGridData.slice(0, currentDisplayCount);
    }, [processedAndFilteredGridData, currentDisplayCount]);


    const fetchDataAndBuildTree = useCallback(async () => {
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
            if (error.response && error.response.status === 401) {
                localStorage.removeItem('authToken');
                navigate("/");
                showAlert('Oturumunuzun süresi doldu veya yetkiniz yok. Lütfen tekrar giriş yapın.', 'error');
            }
            console.error("Ağaç verisi yüklenirken hata oluştu:", error);
            showAlert('Kategori ve ürünler yüklenirken bir hata oluştu.', 'error');
        } finally {
            setLoadingTree(false);
        }
    }, [navigate, showAlert]);

    const loadExistingTenderDetails = useCallback(async () => {
        if (!tenderId) return;

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
                {
                    headers: {
                        'Authorization': `Bearer ${authToken}`
                    }
                }
            );

            if (response.data && response.data.data) {
                const tenderData = response.data.data;
                setTenderTitle(tenderData.title || `İhale Yükleniyor... (ID: ${tenderId})`);

                const loadedDetails: TenderDetailRow[] = tenderData.tenderDetails.map((detail, index) => {
                    const ourProcuredItemPriceNum = parseAndCleanFloat(detail.ourProcuredItemPrice);
                    const montajPriceNum = parseAndCleanFloat(detail.montajPrice);
                    const demontajPriceNum = parseAndCleanFloat(detail.demontajPrice);
                    const demontajMontajPriceNum = parseAndCleanFloat(detail.demontajMontajPrice);

                    const malzeme = parseAndCleanInt(detail.firmProcuredItemQuantities || 0);

                    const malzemeYuklenici = parseAndCleanInt(detail.ourProcuredItemQuantities);
                    const montaj = parseAndCleanInt(detail.montajQuantity || 0);
                    const demontaj = parseAndCleanInt(detail.demontaj);
                    const demontajMontaj = parseAndCleanInt(detail.demontajMontaj);

                    const tedasNo = parseAndCleanInt(detail.tedasNo || 0);
                    const anaNo = parseAndCleanInt(detail.anaNo || 0);
                    const altNo = parseAndCleanInt(detail.altNo || 0);
                    const aciklama = String(detail.aciklama || '');
                    const eskiPoz = String(detail.eskiPoz || '');

                    const isItemCategory = !detail.item.unit?.title || detail.item.unit.title.trim() === '';
                    const categoryPercentage = isItemCategory && (detail as any).categoryPercentage ? parseAndCleanFloat((detail as any).categoryPercentage) : null;

                    const baseRow: Partial<TenderDetailRow> = {
                        id: detail.id,
                        siraNo: index + 1,
                        eskiPoz: eskiPoz,
                        tedasNo: tedasNo,
                        anaNo: anaNo,
                        altNo: altNo,
                        description: detail.item.name || "N/A",
                        olcuBrimi: detail.item.unit?.title || "",
                        malzeme: malzeme,
                        malzemeYuklenici: malzemeYuklenici,
                        montaj: montaj,
                        demontaj: demontaj,
                        demontajMontaj: demontajMontaj,
                        birimFiyatMalzeme: ourProcuredItemPriceNum,
                        birimFiyatMontaj: montajPriceNum,
                        birimFiyatDemontaj: demontajPriceNum,
                        birimFiyatDemontajMontaj: demontajMontajPriceNum,
                        toplamMalzeme: 0, // Will be recalculated by calculateTotals
                        toplamMontaj: 0,  // Will be recalculated by calculateTotals
                        toplamDemontaj: 0, // Will be recalculated by calculateTotals
                        toplamDemontajdanMontaj: 0, // Will be recalculated by calculateTotals
                        isUnregisteredItem: false,
                        itemId: detail.item.id || null,
                        aciklama: aciklama,
                        categoryPercentage: categoryPercentage,
                        isCategory: isItemCategory,
                        isFromExcel: false, // Mark as NOT from Excel, will be calculated by logic
                    };
                    // Force recalculation for data loaded from API
                    return calculateTotals(baseRow, true); 
                });
                setGridData(loadedDetails);
                showAlert('İhale detayları başarıyla yüklendi.', 'success');
            } else {
                setGridData([]);
                showAlert('Bu ihale için detay bulunamadı.', 'info');
            }

        } catch (error: any) {
            if (error.response && error.response.status === 401) {
                localStorage.removeItem('authToken');
                navigate("/");
                showAlert('Oturumunuzun süresi doldu veya yetkiniz yok. Lütfen tekrar giriş yapın.', 'error');
            }
            console.error("İhale detayları yüklenirken hata oluştu:", error);
            showAlert('İhale detayları yüklenirken bir hata oluştu.', 'error');
            return null;
        } finally {
            setLoading(false);
        }
    }, [tenderId, navigate, showAlert, calculateTotals]); // Added calculateTotals to dependencies

    useEffect(() => {
        loadExistingTenderDetails();
        fetchDataAndBuildTree();
    }, [loadExistingTenderDetails, fetchDataAndBuildTree]);

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

    useEffect(() => {
        if (!gridData.length || !combinedTreeData.length) {
            return;
        }
        let needsUpdate = false;
        const updatedGridData = gridData.map(row => {
            const normalizedRowDescription = normalizeString(row.description);
            let foundNode: UnifiedTreeNode | undefined;
            let isUnregistered: boolean;
            let currentItemId: number | null = null;

            const isCurrentlyCategory = row.isCategory || (row.description.trim() !== '' && row.olcuBrimi.trim() === '');

            if (isCurrentlyCategory) {
                foundNode = findNodeByNameAndType(combinedTreeData, normalizedRowDescription, 'category');
                isUnregistered = !foundNode;
                currentItemId = null;
            } else {
                foundNode = findNodeByNameAndType(combinedTreeData, normalizedRowDescription, 'item');
                isUnregistered = !foundNode;
                currentItemId = foundNode?.originalData?.id ?? null;
            }

            if (row.isUnregisteredItem !== isUnregistered || row.itemId !== currentItemId || row.isCategory !== isCurrentlyCategory) {
                needsUpdate = true;
                return { ...row, isUnregisteredItem: isUnregistered, itemId: currentItemId, isCategory: isCurrentlyCategory };
            }
            return row;
        });

        if (needsUpdate) {
            setGridData(updatedGridData);
        }
    }, [gridData, combinedTreeData, normalizeString, findNodeByNameAndType]);

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
            if (error.response && error.response.status === 401) {
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
                let currentSiraNoForImport = getNextAvailableSiraNo(gridData);
                let duplicateCount = 0;

                const getCellValue = (rowIdx: number, colIdx: number): any => {
                    const cellAddress = XLSX.utils.encode_cell({ r: rowIdx, c: colIdx });
                    const cell = worksheet[cellAddress];
                    return cell ? cell.v : undefined;
                };

                for (let R = 4; R <= range.e.r; R++) { // Start from row 5 (index 4) based on your template
                    const eskiPozValue = String(getCellValue(R, 0) || '').trim(); // A
                    const tedasNo = parseAndCleanInt(getCellValue(R, 1)); // B
                    const anaNo = parseAndCleanInt(getCellValue(R, 2)); // C
                    const altNo = parseAndCleanInt(getCellValue(R, 3));

                    const descriptionValue = String(getCellValue(R, 4) || '').trim(); // E
                    const olcuBrimi = String(getCellValue(R, 5) || '').trim(); // F

                    const isCurrentRowCategory = (descriptionValue !== '' && olcuBrimi === '');

                    if (descriptionValue === '' && olcuBrimi === '') {
                        continue;
                    }

                    if (isItemDescriptionDuplicate(descriptionValue, gridData)) {
                        duplicateCount++;
                        continue;
                    }

                    const malzeme = parseAndCleanFloat(getCellValue(R, 6)); // G (MALZEME)
                    const malzemeYuklenici = parseAndCleanInt(getCellValue(R, 7)); // H (MALZEME MİKTARI)
                    const montaj = parseAndCleanInt(getCellValue(R, 8)); // I (MONTAJ MİKTARI) - Use Excel value, don't recalculate here
                    const demontaj = parseAndCleanInt(getCellValue(R, 9)); // J (DEMONTAJ MİKTARI)
                    const demontajMontaj = parseAndCleanInt(getCellValue(R, 10)); // K (DMM MİKTARI)

                    const birimFiyatMalzeme = parseAndCleanFloat(getCellValue(R, 11)); // L (MALZEME (TL))
                    const birimFiyatMontaj = parseAndCleanFloat(getCellValue(R, 12)); // M (MONTAJ (TL))
                    const birimFiyatDemontaj = parseAndCleanFloat(getCellValue(R, 13)); // N (DEMONTAJ (SÖKME) (TL))
                    const birimFiyatDemontajMontaj = parseAndCleanFloat(getCellValue(R, 14)); // O (DEMONTAJDAN MONTAJ (TL))

                    const aciklama = String(getCellValue(R, 15) || '').trim(); // P (AÇIKLAMA)

                    const categoryPercentage = parseAndCleanFloat(getCellValue(R, 16)); // Q (%Kategoriler)

                    // Get TUTARLAR directly from Excel, as per requirement
                    const toplamMalzemeFromExcel = parseAndCleanFloat(getCellValue(R, 17)); // R
                    const toplamMontajFromExcel = parseAndCleanFloat(getCellValue(R, 18)); // S
                    const toplamDemontajFromExcel = parseAndCleanFloat(getCellValue(R, 19)); // T
                    const toplamDemontajdanMontajFromExcel = parseAndCleanFloat(getCellValue(R, 20)); // U

                    let existingNode: UnifiedTreeNode | undefined;
                    let isCurrentItemUnregistered = false;
                    let currentItemId: number | null = null;

                    if (isCurrentRowCategory) {
                        existingNode = findNodeByNameAndType(combinedTreeData, normalizeString(descriptionValue), 'category');
                        isCurrentItemUnregistered = !existingNode;
                        currentItemId = null;
                    } else {
                        existingNode = findNodeByNameAndType(combinedTreeData, normalizeString(descriptionValue), 'item');
                        isCurrentItemUnregistered = !existingNode;
                        currentItemId = existingNode?.originalData?.id ?? null;
                    }

                    const newRow: TenderDetailRow = {
                        id: currentLocalId++,
                        siraNo: currentSiraNoForImport++,
                        eskiPoz: eskiPozValue,
                        tedasNo: tedasNo,
                        anaNo: anaNo,
                        altNo: altNo,
                        description: descriptionValue,
                        olcuBrimi: olcuBrimi,
                        malzeme: malzeme,
                        malzemeYuklenici: malzemeYuklenici,
                        montaj: montaj, // Using Excel's MONTAJ MİKTARI
                        demontaj: demontaj,
                        demontajMontaj: demontajMontaj,
                        birimFiyatMalzeme: birimFiyatMalzeme,
                        birimFiyatMontaj: birimFiyatMontaj,
                        birimFiyatDemontaj: birimFiyatDemontaj,
                        birimFiyatDemontajMontaj: birimFiyatDemontajMontaj,
                        toplamMalzeme: toplamMalzemeFromExcel, // **Directly use Excel values**
                        toplamMontaj: toplamMontajFromExcel,   // **Directly use Excel values**
                        toplamDemontaj: toplamDemontajFromExcel,
                        toplamDemontajdanMontaj: toplamDemontajdanMontajFromExcel,
                        isUnregisteredItem: isCurrentItemUnregistered,
                        itemId: currentItemId,
                        aciklama: aciklama,
                        categoryPercentage: isCurrentRowCategory ? (categoryPercentage || null) : null,
                        isCategory: isCurrentRowCategory,
                        isFromExcel: true, // **NEW: Mark this row as coming directly from Excel**
                    };
                    importedRows.push(newRow);
                }

                setGridData(prev => [...prev, ...importedRows]);
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
                if (error.response && error.response.status === 401) {
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


    const handleNewRecordInputChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
    ) => {
        const target = e.target as HTMLInputElement | HTMLTextAreaElement;
        const { name, value } = target;

        let cleanedValue = value;
        let parsedNumber: number;

        setNewRecordRow(prev => {
            let updatedRow = { ...prev, isFromExcel: false }; // Mark as not from Excel when manually editing
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
                        updatedRow.categoryPercentage = null; // Should not set for items
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
            // Always force recalculate totals for manual input/changes
            return calculateTotals(updatedRow, true);
        });
    };

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
            if (error.response && error.response.status === 401) {
                localStorage.removeItem('authToken');
                navigate("/");
                showAlert('Oturumunuzun süresi doldu hoặc yetkiniz yok. Lütfen tekrar giriş yapın.', 'error');
            }
            console.error("Ölçü bilgisi yüklenirken hata oluştu:", error);
            showAlert('Ölçü bilgisi yüklenirken bir hata oluştu.', 'error');
            return null;
        }
    }, [navigate, showAlert]);


    const handleNewRecordTreeSelection = async (node: UnifiedTreeNode) => {
        if (node.type === 'item') {
            setNewRecordSelectedUnifiedNodeId(node.id);

            const nodeIdNum = node.originalData?.id ?? null;

            setNewRecordRow(prev => {
                const updatedRow = {
                    ...prev,
                    description: node.name,
                    itemId: nodeIdNum,
                    isCategory: false, // Selected an item, so it's not a category
                    categoryPercentage: null, // Clear percentage for items
                    isFromExcel: false, // Not from Excel on tree selection
                };
                return calculateTotals(updatedRow, true); // Force recalculation on tree selection
            });

            setNewRecordManualInput('');
            setNewRecordTreeSearchTerm(''); // Clear search term after selection
            setIsNewRecordTreeSelectOpen(false);

            const itemIdForApi = node.originalData?.id ? String(node.originalData.id) : null;
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
    };


    const handleEditRecordTreeSelection = async (node: UnifiedTreeNode) => {
        if (node.type === 'item') {
            setEditingRowSelectedUnifiedNodeId(node.id);

            const nodeIdNum = node.originalData?.id ?? null;

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
                    isFromExcel: false, // Not from Excel on tree selection for edit
                }, true); // Force recalculation

                setEditingBirimFiyatMalzeme(formatInputNumberForDisplay(updated.birimFiyatMalzeme, 2));
                setEditingBirimFiyatMontaj(formatInputNumberForDisplay(updated.birimFiyatMontaj, 2));
                setEditingBirimFiyatDemontaj(formatInputNumberForDisplay(updated.birimFiyatDemontaj, 2));
                setEditingBirimFiyatDemontajMontaj(formatInputNumberForDisplay(updated.birimFiyatDemontajMontaj, 2));
                return updated;
            });
            setIsEditingRowTreeSelectOpen(false);
            setEditingRowTreeSearchTerm('');

            const itemIdForApi = node.originalData?.id;
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
    };

    const renderSelectValue = (currentSelectedId: string | null, isEditingContext: boolean, currentTreeSearchTerm: string) => {
        if (currentSelectedId) {
            const node = findNodeById(combinedTreeData, currentSelectedId);
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
    };

    const handleOpenRegisterModalForUnregisteredRow = (row: TenderDetailRow) => {
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
    };

    // const handleUpdateRegisteredItemInGrid = useCallback((registeredData: ApiItemType | ApiCategoryType) => {
    //     setLoadingTree(true);
    //     const authToken = localStorage.localStorage.getItem('authToken');
    //     if (!authToken) {
    //         showAlert('Oturumunuzun süresi doldu.', 'error');
    //         navigate("/");
    //         setLoadingTree(false);
    //         return;
    //     }

    //     axios.all([
    //         axios.get<any>(server.baseurl + server.baseinfo + "get-categories", { headers: { "Authorization": `Bearer ${authToken}` } }),
    //         axios.get<any>(server.baseurl + server.baseinfo + "get-item", { headers: { "Authorization": `Bearer ${authToken}` } })
    //     ] as const)
    //         .then(axios.spread(
    //             (categoriesResponse, itemsResponse) => {
    //                 const categoriesData = categoriesResponse.data.data as ApiCategoryType[] || [];
    //                 const itemsData = itemsResponse.data.data as ApiItemType[] || [];

    //                 const updatedTree = buildCombinedTree(categoriesData, itemsData);
    //                 setCombinedTreeData(updatedTree);
    //                 setLoadingTree(false);

    //                 setGridData(prevGridData => {
    //                     let updated = false;
    //                     const registeredDataName = 'name' in registeredData ? registeredData.name : '';
    //                     const newGridData = prevGridData.map(row => {
    //                         const isCategoryRow = row.isCategory;
    //                         const normalizedRowDescription = normalizeString(row.description);

    //                         if (row.isUnregisteredItem && normalizedRowDescription === normalizeString(registeredDataName)) {
    //                             updated = true;
    //                             if (isCategoryRow && 'categories' in registeredData) {
    //                                 return { ...row, isUnregisteredItem: false, itemId: null };
    //                             } else if (!isCategoryRow && 'category' in registeredData) {
    //                                 return { ...row, isUnregisteredItem: false, itemId: (registeredData as ApiItemType).id };
    //                             }
    //                         }
    //                         return row;
    //                     });
    //                     if (updated) {
    //                         showAlert(`Liste başarıyla güncellendi ve ${registeredDataName} öğesinin durumu ayarlandı!`, 'success');
    //                     }
    //                     return newGridData;
    //                 });
    //             }
    //         ))
    //         .catch(error => {
    //             console.error("Error updating tree after registration:", error);
    //             if (axios.isAxiosError(error) && error.response && error.response.status === 401) {
    //                 localStorage.removeItem('authToken');
    //                 navigate("/");
    //                 showAlert('Oturumunuzun süresi doldu veya yetkiniz yok. Lütfen tekrar giriş yapın.', 'error');
    //             } else {
    //                 showAlert(`Veri başarıyla kaydedildi, اما ağaç güncellenmedi. Lütfen sayfayı yenileyin: ${error.response?.data?.message || error.message || 'Bilinmeyen Hata'}`, 'warning');
    //             }
    //             setLoadingTree(false);
    //         });
    // }, [showAlert, navigate]);

const handleUpdateRegisteredItemInGrid = useCallback((registeredData: ApiItemType | ApiCategoryType) => {
    setLoadingTree(true);
    // Fix for potential `localStorage.localStorage` typo, ensure it's just `localStorage`
    const authToken = localStorage.getItem('authToken'); 
    if (!authToken) {
        showAlert('Oturumunuzun süresi doldu.', 'error');
        navigate("/");
        setLoadingTree(false);
        return;
    }

    // Explicitly define types for axios.all promises for better type inference
    axios.all([
               axios.get<any>(server.baseurl + server.baseinfo + "get-categories", { headers: { "Authorization": `Bearer ${authToken}` } }),
            axios.get<any>(server.baseurl + server.baseinfo + "get-item", { headers: { "Authorization": `Bearer ${authToken}` } })
        
    ])
        .then(axios.spread( // axios.spread will correctly unpack the results based on the Promise types
            (categoriesResponse, itemsResponse) => {
                const categoriesData = categoriesResponse.data.data || [];
                const itemsData = itemsResponse.data.data || [];

                const updatedTree = buildCombinedTree(categoriesData, itemsData);
                setCombinedTreeData(updatedTree);
                setLoadingTree(false);

                setGridData(prevGridData => {
                    let updated = false;
                    const registeredDataName = 'name' in registeredData ? registeredData.name : '';
                    const newGridData = prevGridData.map(row => {
                        const isCategoryRow = row.isCategory;
                        const normalizedRowDescription = normalizeString(row.description);

                        // Check if this is the row that was just registered
                        if (row.isUnregisteredItem && normalizedRowDescription === normalizeString(registeredDataName)) {
                            updated = true;
                            let newItemId: number | null = row.itemId; // Default to existing itemId

                            // Determine the new itemId based on whether it's an item or category
                            if (!isCategoryRow && 'id' in registeredData) {
                                // For an item, registeredData.id is a number.
                                newItemId = Number(registeredData.id); 
                            } else if (isCategoryRow) {
                                // For a category, itemId should be null
                                newItemId = null;
                            }
                            
                            const updatedRow: TenderDetailRow = {
                                ...row,
                                isUnregisteredItem: false, // This is the key change
                                itemId: newItemId, // Assign the (possibly new) numeric itemId
                                // The `toplam` values will be re-evaluated by `processedAndFilteredGridData`
                                // which calls `calculateTotals` without forceRecalculate (which respects `isFromExcel`)
                                // or with forceRecalculate:true if category percentage changes.
                                // This is crucial for UI consistency without full reload.
                            };
                            return updatedRow;
                        }
                        return row;
                    });
                    if (updated) {
                        showAlert(`Liste başarıyla güncellendi و "${registeredDataName}" öğesinin durumu ayarlandı!`, 'success');
                    }
                    return newGridData;
                });
            }
        ))
        .catch(error => {
            console.error("Error updating tree after registration:", error);
            if (axios.isAxiosError(error) && error.response && error.response.status === 401) {
                localStorage.removeItem('authToken');
                navigate("/");
                showAlert('Oturumunuzun süresi doldu veya yetkiniz yok. Lütfen tekrar giriş yapın.', 'error');
            } else {
                showAlert(`Veri başarıyla kaydedildi، اما ağaç güncellenmedi. Lütfen sayfayı yenileyin: ${error.response?.data?.message || error.message || 'Bilinmeyen Hata'}`, 'warning');
            }
            setLoadingTree(false);
        });
}, [showAlert, navigate, normalizeString]); // Added normalizeString to dependencies

    const handleRegistrationSuccess = useCallback((registeredData: ApiItemType | ApiCategoryType) => {
        setOpenRegisterItemModal(false);
        setOpenRegisterCategoryModal(false);
        setItemToRegister(null);
        setCategoryToRegister(null);

        handleUpdateRegisteredItemInGrid(registeredData);

    }, [handleUpdateRegisteredItemInGrid]);

    const handleCloseRegisterItemModal = () => {
        setOpenRegisterItemModal(false);
        setItemToRegister(null);
    };

    const handleCloseRegisterCategoryModal = () => {
        setOpenRegisterCategoryModal(false);
        setCategoryToRegister(null);
    };


    const handleAddRecord = async () => {
        let finalDescription = '';
        let finalItemId: number | null = null;
        const selectedNode = newRecordSelectedUnifiedNodeId ? findNodeById(combinedTreeData, newRecordSelectedUnifiedNodeId) : null;

        if (selectedNode && selectedNode.type === 'item') {
            finalDescription = selectedNode.name;
            finalItemId = selectedNode.originalData?.id ?? null;
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
            const nodeFromTree = findNodeByNameAndType(combinedTreeData, normalizedFinalDescription, 'item');
            if (nodeFromTree && nodeFromTree.originalData?.id !== undefined) {
                finalItemId = nodeFromTree.originalData.id;
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

            toplamMalzeme: 0, // Placeholder, calculateTotals will set
            toplamMontaj: 0,
            toplamDemontaj: 0,
            toplamDemontajdanMontaj: 0,

            isUnregisteredItem: !findNodeByNameAndType(combinedTreeData, normalizedFinalDescription, isNewRecordCategory ? 'category' : 'item'),
            itemId: finalItemId,
            aciklama: newRecordRow.aciklama,
            categoryPercentage: isNewRecordCategory ? newRecordRow.categoryPercentage : null,
            isCategory: isNewRecordCategory,
            isFromExcel: false, // NEW: Mark new manual entries as NOT from Excel
        }, true); // **Force recalculation for new manual entries**

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

    const handleEditGridRow = (rowId: number) => {
        const rowToEdit = gridData.find(row => row.id === rowId);
        if (rowToEdit) {
            setEditingRowId(rowId);
            setEditingRowData({ ...rowToEdit }); // Create a copy to edit

            setEditingBirimFiyatMalzeme(formatInputNumberForDisplay(rowToEdit.birimFiyatMalzeme, 2));
            setEditingBirimFiyatMontaj(formatInputNumberForDisplay(rowToEdit.birimFiyatMontaj, 2));
            setEditingBirimFiyatDemontaj(formatInputNumberForDisplay(rowToEdit.birimFiyatDemontaj, 2));
            setEditingBirimFiyatDemontajMontaj(formatInputNumberForDisplay(rowToEdit.birimFiyatDemontajMontaj, 2));

            const normalizedDescription = normalizeString(rowToEdit.description);
            let foundNode: UnifiedTreeNode | undefined;

            if (rowToEdit.isCategory) {
                foundNode = findNodeByNameAndType(combinedTreeData, normalizedDescription, 'category');
            } else {
                foundNode = findNodeByNameAndType(combinedTreeData, normalizedDescription, 'item');
            }

            if (foundNode) {
                setEditingRowSelectedUnifiedNodeId(foundNode.id);
                setEditingRowTreeSearchTerm('');
            } else {
                setEditingRowSelectedUnifiedNodeId(null);
                setEditingRowTreeSearchTerm('');
            }
        }
    };


    const handleEditRowInputChange = useCallback((
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
    ) => {
        const target = e.target as HTMLInputElement | HTMLTextAreaElement;
        const { name, value } = target;

        setEditingRowData(prev => {
            if (!prev) return null;

            let updatedData: TenderDetailRow = { ...prev, isFromExcel: false }; // Mark as not from Excel when manually editing

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
                        (updatedData as any)[name] = null; // Cannot set percentage for items
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
                updatedData.isCategory = updatedData.olcuBrimi.trim() === '';
                if (!updatedData.isCategory) updatedData.categoryPercentage = null;
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

            // Always force recalculate totals for edited rows
            const tempUpdatedData = calculateTotals(updatedData, true);

            const foundNode = findNodeByNameAndType(combinedTreeData, normalizeString(tempUpdatedData.description), tempUpdatedData.isCategory ? 'category' : 'item');
            tempUpdatedData.isUnregisteredItem = !foundNode;

            return tempUpdatedData;
        });
    }, [calculateTotals, combinedTreeData, findNodeByNameAndType]);

    const handleUpdateGridRow = async () => {
        if (!editingRowId || !editingRowData) return;

        let updatedRowData: TenderDetailRow = { ...editingRowData };

        const selectedNode = editingRowSelectedUnifiedNodeId ? findNodeById(combinedTreeData, editingRowSelectedUnifiedNodeId) : null;

        if (selectedNode && selectedNode.type === 'item') {
            updatedRowData.description = selectedNode.name;
            updatedRowData.itemId = selectedNode.originalData?.id ?? null;
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

        if (isItemDescriptionDuplicate(updatedRowData.description, gridData, updatedRowData.id)) {
            showAlert(`"${updatedRowData.description}" ürünü zaten listede mevcut. Yinelenen kayıt ekleyemezsiniz. Varolan kaydı düzenleyebilirsiniz.`, 'warning');
            return;
        }

        const normalizedUpdatedDescription = normalizeString(updatedRowData.description);

        let isUnregisteredAfterEdit: boolean;
        if (updatedRowData.isCategory) {
            isUnregisteredAfterEdit = !findNodeByNameAndType(combinedTreeData, normalizedUpdatedDescription, 'category');
            updatedRowData.itemId = null;
        } else {
            isUnregisteredAfterEdit = !findNodeByNameAndType(combinedTreeData, normalizedUpdatedDescription, 'item');
            const nodeFromTree = findNodeByNameAndType(combinedTreeData, normalizedUpdatedDescription, 'item');
            updatedRowData.itemId = nodeFromTree?.originalData?.id ?? null;
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
        const finalCalculatedRow = calculateTotals(updatedRowData, true); // **Force recalculate one last time on save**


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
    const handleCancelEditGridRow = () => {
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
    };

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

        const payload = {
            id: Number(tenderId),
            title: tenderTitle,
            details: gridData.map(row => {
                const mappedItemId = row.itemId !== null ? Number(row.itemId) : null;

                return {
                    id: row.id,
                    eskiPoz: row.eskiPoz,
                    tedasNo: row.tedasNo,
                    anaNo: row.anaNo,
                    altNo: row.altNo,
                    firmProcuredItemQuantities: row.malzeme,
                    ourProcuredItemQuantities: row.malzemeYuklenici,
                    montajQuantity: row.montaj,
                    demontaj: row.demontaj,
                    demontajMontaj: row.demontajMontaj,

                    firmProcuredItemPrice: row.birimFiyatMalzeme,
                    ourProcuredItemPrice: row.birimFiyatMalzeme,
                    montajPrice: row.birimFiyatMontaj,
                    demontajPrice: row.birimFiyatDemontaj,
                    demontajMontajPrice: row.birimFiyatDemontajMontaj,

                    itemId: mappedItemId,
                    aciklama: row.aciklama,
                    categoryPercentage: row.isCategory ? row.categoryPercentage : null,
                    isCategory: row.isCategory,

                    // Send the calculated totals, which now correctly reflect the source (Excel vs. calculated)
                    toplamMalzeme: row.toplamMalzeme, 
                    toplamMontaj: row.toplamMontaj,
                    toplamDemontaj: row.toplamDemontaj,
                    toplamDemontajdanMontaj: row.toplamDemontajdanMontaj,
                };
            })
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
            } else {
                showAlert(`Güncelleme başarısız oldu: ${response.data?.message || 'Bilinmeyen bir hata oluştu.'}`, 'error');
            }
        } catch (error: any) {
            if (error.response && error.response.status === 401) {
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


    const handleDeleteGridRow = (rowId: number) => {
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
    };

    const handleExportExcelPreview = () => {
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
            row.categoryPercentage !== null ? row.categoryPercentage : '',
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

        ws['!merges'] = specificMerges;

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
                                                                setNewRecordRow(prev => calculateTotals({ ...prev, description: newRecordTreeSearchTerm, isCategory: (prev.olcuBrimi.trim() === '') }, true)); // Force recalc
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
                                                                const foundNode = findNodeByNameAndType(combinedTreeData, normalizeString(editingRowData?.description || ''), (editingRowData?.isCategory ?? false) ? 'category' : 'item');
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
                                                        disabled={loading || isSavingAll || isLoading}
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
                                                        disabled={!editingRowData?.isCategory || loading || isSavingAll || isLoading}
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