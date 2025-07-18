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
    IconAlertCircle
} from '@tabler/icons-react';
// فرض بر این است که این دو آیکون از @mui/icons-material هستند
import DoNotDisturbOnRoundedIcon from '@mui/icons-material/DoNotDisturbOnRounded';
import DoneRoundedIcon from '@mui/icons-material/DoneRounded';


import CustomTextField from 'src/components/forms/theme-elements/CustomTextField';
import BlankCard from 'src/components/shared/BlankCard';
import "./style.css"
import { useTooltip, CustomTooltip } from 'src/context/TooltipContext';

// For Excel parsing (XLSX - SheetJS)
import * as XLSX from 'xlsx';

// --- API Imports ---
import axios from 'axios';
import server from 'src/assets/address.json';

// --- Data Interfaces ---
interface TenderDetailRow {
    id: number;
    siraNo: number;
    description: string;
    olcuBrimi: string;
    malzemeGDZ: number;
    malzemeYuklenici: number;
    montaj: number; // calculated field
    demontaj: number;
    demontajMontaj: number; // This is a distinct field
    birimFiyatMalzeme: number;
    birimFiyatMontaj: number;
    birimFiyatDemontaj: number;
    birimFiyatDemontajMontaj: number;
    toplamMalzeme: number; // calculated field
    toplamMontaj: number; // calculated field
    toplamDemontaj: number; // calculated field
    toplamDemontajdanMontaj: number; // calculated field
    isUnregisteredItem: boolean;
    itemId: number | null;
}

// const MOCK_BIRIM_FIYAT_OPTIONS = [
//     { unit: 'Ad.', malzeme: 0.00, montaj: 0.00, demontaj: 0.00, demontajdanMontaj: 0.00 },
//     { unit: 'Kg', malzeme: 0.00, montaj: 0.00, demontaj: 0.00, demontajdanMontaj: 0.00 },
//     { unit: 'M.', malzeme: 0.00, montaj: 0.00, demontaj: 0.00, demontajdanMontaj: 0.00 },
//     { unit: 'Litre', malzeme: 0.00, montaj: 0.00, demontaj: 0.00, demontajdanMontaj: 0.00 },
//     { unit: 'Kutu', malzeme: 0.00, montaj: 0.00, demontaj: 0.00, demontajdanMontaj: 0.00 },
//     { unit: 'Paket', malzeme: 0.00, montaj: 0.00, demontaj: 0.00, demontajdanMontaj: 0.00 },
// ];

interface ApiCategoryType {
    id: string;
    name: string;
    parentId: string | null;
    categories: ApiCategoryType[];
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

// Interface for the top-level response from get-tender-by-id
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

// Interface for each item within the tenderDetails array from the API
interface ApiTenderDetailItem {
    id: number; // ID of the tender detail record itself
    firmProcuredItemQuantities: number;
    ourProcuredItemQuantities: number;
    demontaj: number;
    demontajMontaj: number; // From API response
    firmProcuredItemPrice: string | number;
    ourProcuredItemPrice: string | number;
    montajPrice: string | number;
    demontajPrice: string | number;
    demontajMontajPrice: string | number;
    recordStatus: number;
    createAt: string;
    item: {
        id: number; // Item ID from API is number
        name: string;
        description: string;
        abbreviation: string;
        recordStatus: number;
        createAt: string;
        category: { id: string; name?: string; };
        unit: { id: string; title: string; recordStatus: number; createAt: string; };
    };
}

// Interface for the response from get-item-by-id
interface GetItemByIdApiResponse {
    success: boolean;
    httpStatusCode: number;
    httpStatusCodeName: string;
    message: string;
    data: {
        id: number; // Item ID from this API is number
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
                id: `item-${item.id}`, // Tree node ID as string (e.g., "item-123")
                name: item.name,
                type: 'item',
                depth: depth + 1,
                children: [],
                originalData: item, // originalData.id is number
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

// --- توابع کمکی برای تبدیل ورودی به عدد ---
// این توابع کاما را به نقطه تبدیل کرده و مطمئن می شوند که فقط اعداد (و نقطه برای اعشاری)
// در نهایت تبدیل می شوند.
const parseAndCleanFloat = (value: string | number): number => {
    if (typeof value === 'number') {
        return value;
    }
    // تبدیل کاما به نقطه و حذف کاراکترهای غیر مجاز (به جز اعداد و نقطه)
    const cleanedValue = String(value).replace(/,/g, '.').replace(/[^0-9.]/g, '');
    const parsed = parseFloat(cleanedValue);
    return isNaN(parsed) ? 0 : parsed;
};

const parseAndCleanInt = (value: string | number): number => {
    if (typeof value === 'number') {
        return value;
    }
    // حذف کاما و حذف کاراکترهای غیر مجاز (به جز اعداد)
    const cleanedValue = String(value).replace(/,/g, '').replace(/[^0-9]/g, '');
    const parsed = parseInt(cleanedValue, 10);
    return isNaN(parsed) ? 0 : parsed;
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
    const [loading, setLoading] = useState(false); // برای لودینگ اکسل
    const [isLoading, setIsLoading] = useState(false); // برای لودینگ ذخیره تمام دیتا
    const [isSavingAll, setIsSavingAll] = useState<boolean>(false);
    const [fileUploadedSuccessfully, setFileUploadedSuccessfully] = useState<boolean>(false);

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

    const [newRecordRow, setNewRecordRow] = useState<TenderDetailRow>({
        id: 0,
        siraNo: 0,
        description: '',
        olcuBrimi: '',
        malzemeGDZ: 0,
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
    });

    // این Stateها برای نگهداری ورودی کاربر (String) هستند
    // تا بتوانیم کاراکتر نقطه/کاما را در فیلد نمایش دهیم و بعدا تبدیل کنیم
    const [birimFiyatMalzemeNew, setBirimFiyatMalzemeNew] = useState<string>("0");
    const [birimFiyatMontajNew, setBirimFiyatMontajNew] = useState<string>("0");
    const [birimFiyatDemontajNew, setBirimFiyatDemontajNew] = useState<string>("0");
    const [birimFiyatDemontajMontajNew, setBirimFiyatDemontajMontajNew] = useState<string>("0");

    const [editingRowId, setEditingRowId] = useState<number | null>(null);
    const [editingRowData, setEditingRowData] = useState<TenderDetailRow | null>(null);

    // const [isBirimFiyatEditManuallyEdited, setIsBirimFiyatEditManuallyEdited] = useState({
    //     malzeme: false,
    //     montaj: false,
    //     demontaj: false,
    //     demontajdanMontaj: false,
    // });


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


    const filteredGridData = useMemo(() => {
        if (!gridSearchTerm) {
            return gridData;
        }
        const lowerCaseSearchTerm = gridSearchTerm.toLowerCase();
        return gridData.filter(row =>
            row.description.toLowerCase().includes(lowerCaseSearchTerm)
        );
    }, [gridData, gridSearchTerm]);

    const displayedGridData = useMemo(() => {
        return filteredGridData.slice(0, currentDisplayCount);
    }, [filteredGridData, currentDisplayCount]);


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

    const findNodeByNameAndType = (nodes: UnifiedTreeNode[], name: string, type: 'category' | 'item'): UnifiedTreeNode | undefined => {
        for (const node of nodes) {
            if (node.name === name && node.type === type) {
                return node;
            }
            if (node.children && node.children.length > 0) {
                const found = findNodeByNameAndType(node.children, name, type);
                if (found) return found;
            }
        }
        return undefined;
    };

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

        } catch (error : any) {
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
            showAlert('Oturumunuzun süresi doldu veya yetkiniz yok. Lütfen tekrar giriş yapın.', 'error');
            navigate("/");
            setLoading(false);
            return;
        }

        try {
            console.log(`Loading details for tender ID: ${tenderId}`);
            const response = await axios.get<GetTenderByIdRawResponse>(
                server.baseurl + server.initialoperations + "get-tender-by-id/" + tenderId,
                {
                    headers: {
                        'Authorization': `Bearer ${authToken}`
                    }
                }
            );

            console.log("API Response Data for Tender Details:", response.data);
            
            if (response.data && response.data.data) {
                const tenderData = response.data.data;
                setTenderTitle(tenderData.title || `İhale (ID: ${tenderId})`);

                const loadedDetails: TenderDetailRow[] = tenderData.tenderDetails.map((detail, index) => {
                    // اطمینان از اینکه مقادیر از API به Number تبدیل شده و کاما به نقطه تبدیل شده باشد.
                    // API ممکن است اعداد را به صورت رشته (با کاما یا نقطه) برگرداند.
                    const ourProcuredItemPriceNum = parseAndCleanFloat(detail.ourProcuredItemPrice);
                    const montajPriceNum = parseAndCleanFloat(detail.montajPrice);
                    const demontajPriceNum = parseAndCleanFloat(detail.demontajPrice);
                    const demontajMontajPriceNum = parseAndCleanFloat(detail.demontajMontajPrice);

                    const malzemeGDZ = parseAndCleanInt(detail.firmProcuredItemQuantities);
                    const malzemeYuklenici = parseAndCleanInt(detail.ourProcuredItemQuantities);

                    const montajCalculated = (malzemeGDZ) + (malzemeYuklenici);
                    const demontaj = parseAndCleanInt(detail.demontaj);
                    const demontajdanMontaj = parseAndCleanInt(detail.demontajMontaj); 

                    return {
                        id: detail.id,
                        siraNo: index + 1,
                        description: detail.item.name || "N/A",
                        olcuBrimi: detail.item.unit?.title || "N/A",
                        malzemeGDZ: malzemeGDZ,
                        malzemeYuklenici: malzemeYuklenici,
                        montaj: montajCalculated,
                        demontaj: demontaj,
                        demontajMontaj: demontajdanMontaj, // Assign directly from API response and parsed
                        birimFiyatMalzeme: ourProcuredItemPriceNum,
                        birimFiyatMontaj: montajPriceNum,
                        birimFiyatDemontaj: demontajPriceNum,
                        birimFiyatDemontajMontaj: demontajMontajPriceNum,
                        toplamMalzeme: (malzemeYuklenici) * ourProcuredItemPriceNum,
                        toplamMontaj: montajCalculated * montajPriceNum,
                        toplamDemontaj: demontaj * demontajPriceNum,
                        toplamDemontajdanMontaj: demontajdanMontaj * demontajMontajPriceNum,
                        isUnregisteredItem: false,
                        itemId: detail.item.id || null, 
                    };
                });
                setGridData(loadedDetails);
                showAlert('İhale detayları başarıyla yüklendi.', 'success');
            } else {
                setGridData([]);
                showAlert('Bu ihale için detay bulunamadı.', 'info');
            }

        } catch (error: any) {
            console.error("İhale detayları yüklenirken hata oluştu:", error);
            if (error.response && error.response.status === 401) {
                localStorage.removeItem('authToken');
                navigate("/");
                showAlert('Oturumunuzun süresi doldu veya yetkiniz yok. Lütfen tekrar giriş yapın.', 'error');
            } else {
                showAlert(error.response?.data?.message || 'İhale detayları yüklenirken bir hata oluştu, lütfen tekrar deneyin.', 'error');
            }
            setGridData([]);
        } finally {
            setLoading(false);
        }
    }, [tenderId, navigate, showAlert]);

    useEffect(() => {
        loadExistingTenderDetails();
        fetchDataAndBuildTree();
    }, [loadExistingTenderDetails, fetchDataAndBuildTree]);

    useEffect(() => {
        if (!gridData.length || !combinedTreeData.length) {
            return;
        }

        let needsUpdate = false;
        const updatedGridData = gridData.map(row => {
            const foundNode = findNodeByNameAndType(combinedTreeData, row.description, 'item');
            const isUnregistered = !foundNode;
            if (row.isUnregisteredItem !== isUnregistered) {
                needsUpdate = true;
                return { ...row, isUnregisteredItem: isUnregistered };
            }
            return row;
        });

        if (needsUpdate) {
            setGridData(updatedGridData);
        }
    }, [gridData, combinedTreeData, findNodeByNameAndType]);

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


    // ** تابع calculateTotals بدون تغییرات عمده، اما مطمئن می شویم مقادیر ورودی از قبل به Number تبدیل شده باشند **
    const calculateTotals = useCallback((row: Partial<TenderDetailRow>): TenderDetailRow => {
        const montaj = (row.malzemeGDZ ?? 0) + (row.malzemeYuklenici ?? 0); 

        const birimFiyatMalzeme = row.birimFiyatMalzeme ?? 0;
        const birimFiyatMontaj = row.birimFiyatMontaj ?? 0;
        const birimFiyatDemontaj = row.birimFiyatDemontaj ?? 0;
        const birimFiyatDemontajMontaj = row.birimFiyatDemontajMontaj ?? 0;

        return {
            id: row.id ?? 0,
            siraNo: row.siraNo ?? 0,
            description: row.description ?? '',
            olcuBrimi: row.olcuBrimi ?? '',
            malzemeGDZ: row.malzemeGDZ ?? 0,
            malzemeYuklenici: row.malzemeYuklenici ?? 0,
            montaj: montaj, // Calculated value
            demontaj: row.demontaj ?? 0,
            demontajMontaj: row.demontajMontaj ?? 0, 
            birimFiyatMalzeme: birimFiyatMalzeme,
            birimFiyatMontaj: birimFiyatMontaj,
            birimFiyatDemontaj: birimFiyatDemontaj,
            birimFiyatDemontajMontaj: birimFiyatDemontajMontaj,
            toplamMalzeme: (row.malzemeYuklenici ?? 0) * birimFiyatMalzeme,
            toplamMontaj: montaj * birimFiyatMontaj,
            toplamDemontaj: (row.demontaj ?? 0) * birimFiyatDemontaj,
            toplamDemontajdanMontaj: (row.demontajMontaj ?? 0) * birimFiyatDemontajMontaj, 
            isUnregisteredItem: row.isUnregisteredItem ?? false,
            itemId: row.itemId ?? null,
        };
    }, []);


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
        const explanatoryTexts = [
            "SÖZLEŞME MİKTARLARI PROJESİNE GÖRE ÖNGÖRÜLEN MİKTARLARDIR",
            "A SÜTUNUNDAKİ GDZ TARAFINDAN VERİLECEK MALZEMELERİN MONTAJI K SÜTUNUNDAKİ MONTAJ TUTARINA YANSITILMIŞTIR",
            "A SÜTUNUNDA GDZ TARAFINDAN VERİLMESİ ÖNGÖRÜLEN MALZEMELERİN MALZEME BEDELLERİ, KEŞİF TUTARINA YANSITILMAMIŞTIR.",
            "A SÜTUNUNDA GDZ TARAFINDAN VERİLMESİ ÖNGÖRÜLEN MALZEME LİSTESİNDE GDZ'NİN UYGUN GÖRMESİ HALİNDE SÖZLEŞME SÜRESİ İÇERİSİNDE DEĞİŞİKLİK YAPILABİLİR.",
            "YAPILAN İŞLERİN BEDELLERİNİN ÖDENMESİNDE، GDZ 2024 BİRİM FİYATLARI’NA YÜKLENİCİ’NİN TEKLİF ETTİĞİ TENZİLAT UYGULANARAK BULUNAN VE SÖZLEŞME BEDELİNİN TESPİTİNDE KULLANILAN BİRİM FİYATLAR İLE VARSA SONRADAN TESPİT EDILEN YENİ BİRİM FİYATLAR ESAS ALINACAKTIR."
        ].map(text => text.trim());
        reader.onprogress = (e) => {
            if (e.lengthComputable) {
                // const percentCompleted = Math.round((e.loaded * 100) / e.total);
            }
        };

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

                for (let R = 4; R <= range.e.r; R++) {
                    const descriptionValue = String(getCellValue(R, 1) || '').trim();
                    const olcuBrimi = String(getCellValue(R, 2) || '').trim();

                    if (!olcuBrimi || explanatoryTexts.includes(descriptionValue)) {
                        continue;
                    }

                    if (isItemDescriptionDuplicate(descriptionValue, gridData)) {
                        console.warn(`"${descriptionValue}" ürünü zaten mevcut, atlanıyor.`);
                        duplicateCount++;
                        continue;
                    }

                    // استفاده از توابع parseAndCleanInt و parseAndCleanFloat برای تبدیل مقادیر
                    const malzemeGDZ = parseAndCleanInt(getCellValue(R, 3));
                    const malzemeYuklenici = parseAndCleanInt(getCellValue(R, 4));
                    const demontaj = parseAndCleanInt(getCellValue(R, 6));
                    const demontajdanMontaj = parseAndCleanInt(getCellValue(R, 7));

                    const birimFiyatMalzeme = parseAndCleanFloat(getCellValue(R, 8));
                    const birimFiyatMontaj = parseAndCleanFloat(getCellValue(R, 9));
                    const birimFiyatDemontaj = parseAndCleanFloat(getCellValue(R, 10));
                    const birimFiyatDemontajMontaj = parseAndCleanFloat(getCellValue(R, 11));

                    const existingNode = findNodeByNameAndType(combinedTreeData, descriptionValue, 'item');
                    const itemId = existingNode?.originalData?.id ?? null; // originalData.id is number or null

                    const newRow: TenderDetailRow = calculateTotals({
                        id: currentLocalId++,
                        siraNo: currentSiraNoForImport++,
                        description: descriptionValue,
                        olcuBrimi: olcuBrimi,
                        malzemeGDZ: malzemeGDZ,
                        malzemeYuklenici: malzemeYuklenici,
                        demontaj: demontaj,
                        demontajMontaj: demontajdanMontaj, 
                        birimFiyatMalzeme: birimFiyatMalzeme,
                        birimFiyatMontaj: birimFiyatMontaj,
                        birimFiyatDemontaj: birimFiyatDemontaj,
                        birimFiyatDemontajMontaj: birimFiyatDemontajMontaj,
                        isUnregisteredItem: !existingNode,  
                        itemId: itemId,  
                    });
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
                           showAlert(`Hiçbir kayıt eklenemedi. ${duplicateCount} adet yinelenen kayıt atlandı.`, 'warning');
                    } else {
                        showAlert('Excel dosyasında eklenecek geçerli kayıt bulunamadı.', 'info');
                    }
                    setFileUploadedSuccessfully(false);
                }

            } catch (error : any) {
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
        const target = e.target as HTMLInputElement;
        const { name, value } = target;
        
        if (name === 'birimFiyatMalzeme') {
            setBirimFiyatMalzemeNew(value); // اینجا فقط رشته رو ذخیره می‌کنیم
        } else if (name === 'birimFiyatMontaj') {
            setBirimFiyatMontajNew(value);
        } else if (name === 'birimFiyatDemontaj') {
            setBirimFiyatDemontajNew(value);
        } else if (name === 'birimFiyatDemontajMontaj') {
            setBirimFiyatDemontajMontajNew(value);
        }
        else if (name === 'newRecordManualInput') {
            setNewRecordManualInput(String(value));
            setNewRecordRow(prev => ({ ...prev, description: String(value) }));
            setNewRecordSelectedUnifiedNodeId(null);
        }
        // برای مقادیر کمیتی (integer) از parseAndCleanInt استفاده می‌کنیم
        else if (['malzemeGDZ', 'malzemeYuklenici', 'demontaj', 'demontajMontaj'].includes(name)) {
            setNewRecordRow(prev => ({
                ...prev,
                [name]: parseAndCleanInt(value) // تبدیل به عدد صحیح
            }));
        } else {
            setNewRecordRow(prev => ({
                ...prev,
                [name as keyof TenderDetailRow]: value as any  
            }));
        }
    };

    // محاسبات برای ردیف جدید:
    // اطمینان حاصل کنید که قبل از محاسبه، مقادیر `birimFiyatXxxNew` به عدد تبدیل شده‌اند.
    const calculatedNewRecordMontaj = newRecordRow.malzemeGDZ + newRecordRow.malzemeYuklenici;
    const calculatedNewRecordToplamMalzeme = newRecordRow.malzemeYuklenici * parseAndCleanFloat(birimFiyatMalzemeNew);
    const calculatedNewRecordToplamMontaj = calculatedNewRecordMontaj * parseAndCleanFloat(birimFiyatMontajNew);
    const calculatedNewRecordToplamDemontaj = newRecordRow.demontaj * parseAndCleanFloat(birimFiyatDemontajNew);
    const calculatedNewRecordToplamDemontajdanMontaj = newRecordRow.demontajMontaj * parseAndCleanFloat(birimFiyatDemontajMontajNew);

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
        } catch (error : any) {
            if (error.response && error.response.status === 401) {
                localStorage.removeItem('authToken');
                navigate("/");
                showAlert('Oturumunuzun süresi doldu veya yetkiniz yok. Lütfen tekrar giriş yapın.', 'error');
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

            setNewRecordRow(prev => ({
                ...prev,
                description: node.name,
                itemId: nodeIdNum,  
            }));
            
            setNewRecordManualInput('');
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
                if (!prev) return null;
                return calculateTotals({
                    ...prev,
                    description: node.name,
                    itemId: nodeIdNum,
                });
            });
            setIsEditingRowTreeSelectOpen(false);

            const itemIdForApi = node.originalData?.id;
            if (itemIdForApi) {
                const unitTitle = await fetchItemUnitById(String(itemIdForApi));
                setEditingRowData(prev => {
                    if (!prev) return null;
                    return calculateTotals({
                        ...prev,
                        olcuBrimi: unitTitle || '',
                    });
                });
            } else {
                setEditingRowData(prev => {
                    if (!prev) return null;
                    return calculateTotals({ ...prev, olcuBrimi: '' });
                });
            }

            // اینجا مقادیر birimFiyatEdit را به state اصلی برگردانده و پرچم‌ها را ریست می‌کنیم.
            setEditingRowData(prev => {
                if (!prev) return null;
                return {
                    ...prev,
                    // این مقادیر از قبل در `rowToEdit` تنظیم شده بودند.
                    // فقط نیاز داریم که آنها را به عنوان String نمایش دهیم.
                    // پس نیازی به تغییر اینجا نیست مگر اینکه بخواهیم default unit price را اعمال کنیم.
                    // اگر میخواهیم قیمت های Mock را اعمال کنیم، اینجا باید اعمال شوند.
                    // در غیر اینصورت، همان مقادیر قبلی را نگه میداریم.
                };
            });

            // setIsBirimFiyatEditManuallyEdited({
            //     malzeme: false,
            //     montaj: false,
            //     demontaj: false,
            //     demontajdanMontaj: false,
            // });
        }
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
            showAlert('Açıklama (MALZEME VEYA İŞİN CİNSİ) alanı boş olamaz. Lütfen bir ürün seçin veya manuel girin.', 'warning');
            return;
        }

        if (isItemDescriptionDuplicate(finalDescription, gridData)) {
            showAlert(`"${finalDescription}" ürünü zaten listede mevcut. Yinelenen kayıt ekleyemezsiniz. Varolan kaydı düzenleyebilirsiniz.`, 'warning');
            return;
        }

        if (newRecordManualInput.trim() !== '' && (!selectedNode || selectedNode.type !== 'item')) {
            const addedItemId = await addNewItemToApi(finalDescription); // Returns number | null
            if (addedItemId !== null) {
                finalItemId = addedItemId;
                await fetchDataAndBuildTree(); // Refresh tree after adding new item
            } else {
                return; // If API add failed, stop
            }
        }
        
        if (finalItemId === null && finalDescription !== '') {
            const nodeFromTree = findNodeByNameAndType(combinedTreeData, finalDescription, 'item');
            if (nodeFromTree && nodeFromTree.originalData?.id !== undefined) {
                finalItemId = nodeFromTree.originalData.id;  
            } else {
                showAlert('Ürün ID\'si belirlenemedi. Lütfen önce ürünü kaydedin veya listeden seçin.', 'error');
                return;
            }
        }

        let currentOlcuBrimi = newRecordRow.olcuBrimi;
        if (!currentOlcuBrimi && finalDescription && finalItemId !== null) {
            const unitTitle = await fetchItemUnitById(String(finalItemId)); // Convert number itemId to string for API call
            if (unitTitle) {
                currentOlcuBrimi = unitTitle;
            } else {
                showAlert('Seçilen ürün için ölçü birimi bulunamadı. Lütfen kontrol edin.', 'warning');
            }
        } else if (!currentOlcuBrimi && finalDescription) {
            showAlert('Ölçü Birimi boş olamaz! Lütfen geçerli bir ürün seçin veya manuel girilen ürün için birim tanımlayın.', 'warning');
            return;
        }


        const newRowId = gridData.length > 0 ? Math.max(...gridData.map(row => row.id)) + 1 : 1;
        const nextSiraNo = getNextAvailableSiraNo(gridData);

        const newRecord: TenderDetailRow = calculateTotals({
            id: newRowId,
            siraNo: nextSiraNo,
            description: finalDescription,
            olcuBrimi: currentOlcuBrimi,
            malzemeGDZ: newRecordRow.malzemeGDZ,
            malzemeYuklenici: newRecordRow.malzemeYuklenici,
            demontaj: newRecordRow.demontaj,
            demontajMontaj: newRecordRow.demontajMontaj,  
            // تبدیل رشته‌های birimFiyatNew به عدد قبل از ارسال به calculateTotals
            birimFiyatMalzeme: parseAndCleanFloat(birimFiyatMalzemeNew),
            birimFiyatMontaj: parseAndCleanFloat(birimFiyatMontajNew),
            birimFiyatDemontaj: parseAndCleanFloat(birimFiyatDemontajNew),
            birimFiyatDemontajMontaj: parseAndCleanFloat(birimFiyatDemontajMontajNew),
            // Pass the calculated values for total columns
            toplamMalzeme: calculatedNewRecordToplamMalzeme,  
            toplamMontaj: calculatedNewRecordToplamMontaj,
            toplamDemontaj: calculatedNewRecordToplamDemontaj,
            toplamDemontajdanMontaj: calculatedNewRecordToplamDemontajdanMontaj,
            isUnregisteredItem: !findNodeByNameAndType(combinedTreeData, finalDescription, 'item'),
            itemId: finalItemId,  
        });

        setGridData(prev => [...prev, newRecord]);
        showAlert('Yeni kayıt başarıyla eklendi!', 'success');

        setNewRecordRow({
            id: 0,
            siraNo: 0,
            description: '',
            olcuBrimi: '',
            malzemeGDZ: 0,
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
        });
        setNewRecordSelectedUnifiedNodeId(null);
        setNewRecordManualInput('');

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
            setEditingRowData({ ...rowToEdit });

            // برای نمایش صحیح در فیلدهای ویرایش، مقادیر عددی را به رشته تبدیل می‌کنیم و کاما اضافه می‌کنیم
            // تا با فرمت نمایش در UI همخوانی داشته باشد.
            setEditingRowData(prev => prev ? {
                ...prev,
                birimFiyatMalzeme: prev.birimFiyatMalzeme, // اینجا Number است
                birimFiyatMontaj: prev.birimFiyatMontaj,
                birimFiyatDemontaj: prev.birimFiyatDemontaj,
                birimFiyatDemontajMontaj: prev.birimFiyatDemontajMontaj,
            } : null);

            const foundNode = findNodeByNameAndType(combinedTreeData, rowToEdit.description, 'item');
            if (foundNode) {
                setEditingRowSelectedUnifiedNodeId(foundNode.id);
                setEditingRowTreeSearchTerm('');
            } else {
                setEditingRowSelectedUnifiedNodeId(null);
                setEditingRowTreeSearchTerm('');
            }

            // const selectedUnitRates = MOCK_BIRIM_FIYAT_OPTIONS.find(f => f.unit === rowToEdit.olcuBrimi);
            // setIsBirimFiyatEditManuallyEdited({
            //     malzeme: rowToEdit.birimFiyatMalzeme !== (selectedUnitRates?.malzeme ?? 0),
            //     montaj: rowToEdit.birimFiyatMontaj !== (selectedUnitRates?.montaj ?? 0),
            //     demontaj: rowToEdit.birimFiyatDemontaj !== (selectedUnitRates?.demontaj ?? 0),
            //     demontajdanMontaj: rowToEdit.birimFiyatDemontajMontaj !== (selectedUnitRates?.demontajdanMontaj ?? 0),
            // });
        }
    };

    const handleEditRowInputChange = useCallback((
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
    ) => {
        const target = e.target as HTMLInputElement;
        const { name, value } = target;

        setEditingRowData(prev => {
            if (!prev) return null;

            let updatedData: TenderDetailRow = { ...prev };

            if (name === 'birimFiyatMalzeme') {
                updatedData.birimFiyatMalzeme = parseAndCleanFloat(value); // تبدیل به عدد اعشاری
                // setIsBirimFiyatEditManuallyEdited(prevFlags => ({ ...prevFlags, malzeme: true }));
            } else if (name === 'birimFiyatMontaj') {
                updatedData.birimFiyatMontaj = parseAndCleanFloat(value); // تبدیل به عدد اعشاری
                // setIsBirimFiyatEditManuallyEdited(prevFlags => ({ ...prevFlags, montaj: true }));
            } else if (name === 'birimFiyatDemontaj') {
                updatedData.birimFiyatDemontaj = parseAndCleanFloat(value); // تبدیل به عدد اعشاری
                // setIsBirimFiyatEditManuallyEdited(prevFlags => ({ ...prevFlags, demontaj: true }));
            } else if (name === 'birimFiyatDemontajMontaj') {
                updatedData.birimFiyatDemontajMontaj = parseAndCleanFloat(value); // تبدیل به عدد اعشاری
                // setIsBirimFiyatEditManuallyEdited(prevFlags => ({ ...prevFlags, demontajdanMontaj: true }));
            }
            else if (name === 'editingRowDescription') {
                setEditingRowTreeSearchTerm(String(value));
                setEditingRowSelectedUnifiedNodeId(null);
                updatedData.description = String(value);
            }
            // برای مقادیر کمیتی (integer) از parseAndCleanInt استفاده می‌کنیم
            else if (name === 'malzemeGDZ') {
                updatedData.malzemeGDZ = parseAndCleanInt(value);
            } else if (name === 'malzemeYuklenici') {
                updatedData.malzemeYuklenici = parseAndCleanInt(value);
            } else if (name === 'demontaj') {
                updatedData.demontaj = parseAndCleanInt(value);
            }  else if (name === 'demontajMontaj') { 
                updatedData.demontajMontaj = parseAndCleanInt(value);
            }
            
            const foundNode = findNodeByNameAndType(combinedTreeData, updatedData.description, 'item');
            updatedData.isUnregisteredItem = !foundNode;

            return calculateTotals(updatedData);
        });
    }, [calculateTotals, combinedTreeData, findNodeByNameAndType]);


    const handleUpdateGridRow = async () => {
        if (!editingRowId || !editingRowData) return;

        let updatedRowData: TenderDetailRow = { ...editingRowData };

        const selectedNode = editingRowSelectedUnifiedNodeId ? findNodeById(combinedTreeData, editingRowSelectedUnifiedNodeId) : null;
        if (selectedNode && selectedNode.type === 'item') {
            updatedRowData.description = selectedNode.name;
            updatedRowData.itemId = selectedNode.originalData?.id ?? null;  
        }
        else if (editingRowTreeSearchTerm && !editingRowSelectedUnifiedNodeId) {
            updatedRowData.description = editingRowTreeSearchTerm;
        }

        if (!updatedRowData.description) {
            showAlert('Açıklama (MALZEME VEYA İŞİN CİNSİ) boş olamaz!', 'warning');
            return;
        }
        if (!updatedRowData.olcuBrimi) {
            showAlert('Ölçü Birimi boş olamaz! Lütfen geçerli bir ürün seçin.', 'warning');
            return;
        }

        if (isItemDescriptionDuplicate(updatedRowData.description, gridData, updatedRowData.id)) {
            showAlert(`"${updatedRowData.description}" ürünü zaten başka bir satırda mevcut. Yinelenen kayıt ekleyemezsiniz.`, 'warning');
            return;
        }

        const foundNode = findNodeByNameAndType(combinedTreeData, updatedRowData.description, 'item');
        updatedRowData.isUnregisteredItem = !foundNode;


        setGridData(prev => prev.map(row =>
            row.id === editingRowId
                ? calculateTotals(updatedRowData)
                : row
        ));

        setEditingRowId(null);
        setEditingRowData(null);
        setEditingRowSelectedUnifiedNodeId(null);
        setIsEditingRowTreeSelectOpen(false);
        setEditingRowTreeSearchTerm('');
        // setIsBirimFiyatEditManuallyEdited({
        //     malzeme: false, montaj: false, demontaj: false, demontajdanMontaj: false,
        // });
        showAlert('Giriş başarıyla güncellendi!', 'success');
    };


    const handleCancelEditGridRow = () => {
        setEditingRowId(null);
        setEditingRowData(null);
        setEditingRowSelectedUnifiedNodeId(null);
        setIsEditingRowTreeSelectOpen(false);
        setEditingRowTreeSearchTerm('');
        // setIsBirimFiyatEditManuallyEdited({
        //     malzeme: false, montaj: false, demontaj: false, demontajdanMontaj: false,
        // });
        showAlert('İşlem iptal edildi.', 'info');
    };

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

    const totalGdz2024CombinedTutari = useMemo(() => {
        return totalGdz2024MalzemeTutari + totalGdz2024MontajTutari + totalGdz2024DemontajTutari + totalGdz2024DemontajdanMontajTutari;
    }, [totalGdz2024MalzemeTutari, totalGdz2024MontajTutari, totalGdz2024DemontajTutari, totalGdz2024DemontajdanMontajTutari]);

    const hasUnregisteredItems = useMemo(() => {
        return gridData.some(row => row.isUnregisteredItem);
    }, [gridData]);


    const formatNumber = (value: number | null, decimalPlaces: number = 0, useGrouping: boolean = true) => {
        if (value === null || isNaN(value)) return '0';
        // برای نمایش در UI، کاما را به عنوان جداکننده اعشار استفاده می‌کنیم اگر نیاز باشد.
        return value.toLocaleString('tr-TR', { // 'tr-TR' برای استفاده از کاما به عنوان جداکننده اعشار و نقطه برای هزارگان
            minimumFractionDigits: decimalPlaces,
            maximumFractionDigits: decimalPlaces,
            useGrouping: useGrouping
        });
    };

    // این تابع برای تنظیم مقدار `value` در CustomTextField است.
    // در اینجا، ما باید مقدار عددی را به فرمت رشته‌ای که کاربر می‌بیند (با کاما برای اعشار) تبدیل کنیم.
    const formatInputNumberForDisplay = (value: number | null, decimalPlaces: number = 0): string => {
        if (value === null || isNaN(value)) return '';
        // اگر اعشار صفر است، فقط قسمت صحیح را برمی‌گردانیم.
        if (decimalPlaces === 0) {
            return value.toFixed(0);
        }
        // اگر اعشار داریم، به صورت رشته با کاما (برای نمایش به کاربر) تبدیل می‌کنیم.
        // `toLocaleString` با locale 'tr-TR' این کار را انجام می‌دهد.
        return value.toLocaleString('tr-TR', {
            minimumFractionDigits: decimalPlaces,
            maximumFractionDigits: decimalPlaces,
            useGrouping: false // برای ورودی، گروپینگ را خاموش می‌کنیم.
        });
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
        
        if (!isEditingContext && newRecordManualInput) {
            return newRecordManualInput;
        }

        if (currentTreeSearchTerm && !currentSelectedId) {
            return currentTreeSearchTerm;
        }
        
        return "Ürün seçin veya manuel girin...";
    };


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
                    if (newCount >= filteredGridData.length) {
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
    }, [gridData, gridSearchTerm, hasMoreData, filteredGridData, initialDisplayLimit, loadMoreStep]);


    const handleSaveAllData = async () => {
        setIsLoading(true);

        const authToken = localStorage.getItem('authToken');
        if (!authToken) {
            showAlert('Lütfen giriş yapın.', 'warning');
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
        if (hasUnregisteredItems) {
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
                    // مقادیر کمیتی
                    firmProcuredItemQuantities: row.malzemeGDZ, // اینها در state از قبل به Number تبدیل شده‌اند.
                    ourProcuredItemQuantities: row.malzemeYuklenici,
                    demontaj: row.demontaj,
                    demontajMontaj: row.demontajMontaj,

                    // مقادیر قیمتی (که Number هستند و به همین صورت ارسال می‌شوند)
                    firmProcuredItemPrice: row.birimFiyatMontaj,  
                    ourProcuredItemPrice: row.birimFiyatMalzeme,   
                    montajPrice: row.birimFiyatMontaj,             
                    demontajPrice: row.birimFiyatDemontaj,         
                    demontajMontajPrice: row.birimFiyatDemontajMontaj, 

                    itemId: mappedItemId 
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
            let resequencedGrid = [];
            let currentSiraNo = 1;
            const sortedUpdatedGrid = [...updatedGrid].sort((a, b) => a.id - b.id);
            for (const row of sortedUpdatedGrid) {
                resequencedGrid.push({ ...row, siraNo: currentSiraNo++ });
            }
            return resequencedGrid;
        });
        showAlert('Giriş başarıyla silindi!', 'success');
        if (editingRowId === rowId) {
            setEditingRowId(null);
            setEditingRowData(null);
            setEditingRowSelectedUnifiedNodeId(null);
            setIsEditingRowTreeSelectOpen(false);
            setEditingRowTreeSearchTerm('');
            // setIsBirimFiyatEditManuallyEdited({
            //     malzeme: false, montaj: false, demontaj: false, demontajdanMontaj: false,
            // });
        }
    };
    // const handleDeleteGridRow = async (rowId: number) => {debugger
    //     // ابتدا رکورد مورد نظر را پیدا می‌کنیم تا مطمئن شویم در State موجود است
    //     const rowToDelete = gridData.find(row => row.id === rowId);
    //     if (!rowToDelete) {
    //         showAlert('حذف نشد: ردیف مورد نظر یافت نشد.', 'error');
    //         return;
    //     }

    //     // مطمئن می‌شویم که tenderId یک عدد معتبر است و از سرور آمده است
    //     // اگر rowId از API آمده باشد، همان را استفاده می‌کنیم، در غیر این صورت، ID داخلی React است.
    //     // API شما انتظار ID اصلی رکورد را دارد، نه ID موقت React.
    //     // بنابراین، فرض می‌کنیم row.id همان ID ای است که از API دریافت شده.
    //     const tenderDetailIdToDelete = Number(rowId); 

    //     if (tenderDetailIdToDelete === 0) { // اگر ID صفر بود (یعنی رکورد جدید و هنوز در API ثبت نشده)
    //         showAlert('این رکورد هنوز در سیستم ثبت نشده است. فقط از جدول محلی حذف می‌شود.', 'info');
    //         // فقط از Grid محلی حذف می‌کنیم
    //         setGridData(prev => {
    //             const updatedGrid = prev.filter(row => row.id !== rowId);
    //             let resequencedGrid = [];
    //             let currentSiraNo = 1;
    //             const sortedUpdatedGrid = [...updatedGrid].sort((a, b) => a.id - b.id);
    //             for (const row of sortedUpdatedGrid) {
    //                 resequencedGrid.push({ ...row, siraNo: currentSiraNo++ });
    //             }
    //             return resequencedGrid;
    //         });
    //         showAlert('رکورد با موفقیت از جدول حذف شد.', 'success');
    //         if (editingRowId === rowId) {
    //             setEditingRowId(null);
    //             setEditingRowData(null);
    //         }
    //         return;
    //     }

    //     setIsLoading(true); // لودینگ را فعال می‌کنیم
    //     const authToken = localStorage.getItem('authToken');
    //     if (!authToken) {
    //         showAlert('Lütfen giriş yapın.', 'warning');
    //         navigate("/");
    //         setIsLoading(false);
    //         return;
    //     }

    //     try {
    //         // فراخوانی API برای حذف
    //         const response = await axios.delete(
    //             `${server.baseurl}${server.initialoperations}delete-tender-detail/${tenderDetailIdToDelete}`, // مطمئن شوید endpoint صحیح است
    //             {
    //                 headers: {
    //                     "Accept": "application/json",
    //                     "Authorization": `Bearer ${authToken}`
    //                 }
    //             }
    //         );

    //         if (response.status === 200 || response.data.success) { // فرض می‌کنیم API در صورت موفقیت 200 برمی‌گرداند یا success: true
    //             // اگر حذف از سرور موفقیت‌آمیز بود، آن را از State محلی هم حذف می‌کنیم
    //             setGridData(prev => {
    //                 const updatedGrid = prev.filter(row => row.id !== rowId);
    //                 // شماره ردیف‌ها را پس از حذف مجدداً تنظیم می‌کنیم
    //                 let resequencedGrid = [];
    //                 let currentSiraNo = 1;
    //                 const sortedUpdatedGrid = [...updatedGrid].sort((a, b) => a.id - b.id);
    //                 for (const row of sortedUpdatedGrid) {
    //                     resequencedGrid.push({ ...row, siraNo: currentSiraNo++ });
    //                 }
    //                 return resequencedGrid;
    //             });
    //             showAlert('Giriş başarıyla silindi!', 'success');
    //             if (editingRowId === rowId) {
    //                 setEditingRowId(null);
    //                 setEditingRowData(null);
    //                 setEditingRowSelectedUnifiedNodeId(null);
    //                 setIsEditingRowTreeSelectOpen(false);
    //                 setEditingRowTreeSearchTerm('');
    //                 // setIsBirimFiyatEditManuallyEdited({
    //                 //     malzeme: false, montaj: false, demontaj: false, demontajdanMontaj: false,
    //                 // });
    //             }
    //         } else {
    //             showAlert(`Silme başarısız oldu: ${response.data?.message || 'Bilinmeyen bir hata oluştu.'}`, 'error');
    //         }
    //     } catch (error: any) {
    //        if (error.response && error.response.status === 401) {
    //             localStorage.removeItem('authToken');
    //             navigate("/");
    //             showAlert('Oturumunuzun süresi doldu veya yetkiniz yok. Lütfen tekrar giriş yapın.', 'error');
    //           }
    //         console.error("Hata oluştu silme işleminde:", error);
    //         showAlert(`Silme işleminde bir hata oluştu: ${error.response?.data?.message || error.message || 'Sunucuya ulaşılamıyor.'}`, 'error');
    //     } finally {
    //         setIsLoading(false); // لودینگ را غیرفعال می‌کنیم
    //     }
    // };
    // --- پایان تابع handleDeleteGridRow اصلاح شده ---
    
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
                    <Grid item xs={12} sm={6} sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'flex-end' }}>
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
                    </Grid>
                </Grid>
            </Paper>

            <Paper elevation={3} sx={{ p: 2, mb: 3 }}>
                <Typography variant="h6" gutterBottom>Tablo İçinde Ara</Typography>
                <TextField
                    fullWidth
                    size="small"
                    placeholder="MALZEME VEYA İŞİN CİNSİ içinde ara..."
                    value={gridSearchTerm}
                    onChange={(e) => setGridSearchTerm(e.target.value)}
                    InputProps={{
                        startAdornment: (<InputAdornment position="start"><IconSearch size={18} /></InputAdornment>),
                    }}
                />
            </Paper>
                {/* پیام های هشدار به اینجا منتقل شده اند */}
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
                        <Table stickyHeader aria-label="tender details table" sx={{ minWidth: 1500 }}>
                            <TableHead>
                                <TableRow>
                                    <TableCell sx={{ position: 'sticky', left: 0, zIndex: 4, backgroundColor: theme.palette.background.paper, minWidth: 80, borderRight: '1px solid ' + theme.palette.divider }}>
                                        <Typography variant="subtitle2" fontWeight="600">POZ NO</Typography>
                                    </TableCell>
                                    <TableCell sx={{ position: 'sticky', left: 80, zIndex: 4, backgroundColor: theme.palette.background.paper, minWidth: 280, borderRight: '1px solid ' + theme.palette.divider }}>
                                        <Typography variant="subtitle2" fontWeight="600">MALZEME VEYA İŞİN CİNSİ</Typography>
                                    </TableCell>
                                    <TableCell sx={{ minWidth: 100, borderRight: '1px solid ' + theme.palette.divider }}>
                                        <Typography variant="subtitle2" fontWeight="600">ÖLÇÜ</Typography>
                                    </TableCell>
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
                                        <Typography variant="subtitle2" fontWeight="600">Aksiyonlar</Typography>
                                    </TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell sx={{ position: 'sticky', left: 0, zIndex: 4, backgroundColor: theme.palette.background.paper, borderTop: '1px solid ' + theme.palette.divider, borderBottom: '1px solid ' + theme.palette.divider, borderRight: '1px solid ' + theme.palette.divider }}></TableCell>
                                    <TableCell sx={{ position: 'sticky', left: 80, zIndex: 4, backgroundColor: theme.palette.background.paper, borderTop: '1px solid ' + theme.palette.divider, borderBottom: '1px solid ' + theme.palette.divider, borderRight: '1px solid ' + theme.palette.divider }}>
                                    </TableCell>
                                    <TableCell sx={{ borderRight: '1px solid ' + theme.palette.divider }}></TableCell>
                                    <TableCell align="center">MALZEME<br />(GDZ)</TableCell>
                                    <TableCell align="center">MALZEME<br />(Yüklenici)</TableCell>
                                    <TableCell align="center">MONTAJ</TableCell>
                                    <TableCell align="center">DEMONTAJ</TableCell>
                                    <TableCell align="center">DEMONTAJDAN<br />MONTAJ</TableCell>
                                    <TableCell align="center">Malzeme</TableCell>
                                    <TableCell align="center">Montaj</TableCell>
                                    <TableCell align="center">Demontaj</TableCell>
                                    <TableCell align="center">Demontajdan Montaj</TableCell>
                                    <TableCell align="center">Malzeme</TableCell>
                                    <TableCell align="center">Montaj</TableCell>
                                    <TableCell align="center">Demontaj</TableCell>
                                    <TableCell align="center">Demontajdan Montaj</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {/* New Record Row (fixed top row) */}
                                <TableRow sx={{ position: 'sticky', top: 75, zIndex: 3, backgroundColor: theme.palette.background.paper, boxShadow: '0px 2px 4px -1px rgba(0,0,0,0.2), 0px 4px 5px 0px rgba(0,0,0,0.14), 0px 1px 10px 0px rgba(0,0,0,0.12)' }}>
                                    <TableCell sx={{ position: 'sticky', left: 0, zIndex: 3, backgroundColor: theme.palette.background.paper, borderRight: '1px solid ' + theme.palette.divider }}>
                                        <CustomTextField
                                            id="new-siraNo"
                                            name="siraNo"
                                            type="text" // تغییر نکردن
                                            size="small"
                                            value={getNextAvailableSiraNo(gridData).toString()}
                                            onChange={() => { }}
                                            sx={{ width: 60 }}
                                            
                                            InputProps={{
                                                sx: {
                                                '& input': { // انتخابگر '& input' عنصر input داخلی را هدف قرار می‌دهد
                                                    textAlign: 'center',
                                                },
                                                },
                                            }}
                                            placeholder="POZ NO"
                                            disabled={true}
                                        />
                                    </TableCell>
                                    <TableCell sx={{ position: 'sticky', left: 80, zIndex: 3, backgroundColor: 'inherit', borderRight: '1px solid ' + theme.palette.divider }}>
                                        <FormControl fullWidth size="small">
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
                                                        placeholder="Ürün ara veya manuel gir..."
                                                        value={newRecordTreeSearchTerm}
                                                        onChange={(e) => setNewRecordTreeSearchTerm(e.target.value)}
                                                        onClick={(e) => e.stopPropagation()}
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
                                                                setNewRecordRow(prev => ({ ...prev, description: newRecordTreeSearchTerm }));
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
                                            sx={{ width: 90 }}
                                            placeholder="Ölçü"
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <CustomTextField
                                            id="new-malzemeGDZ"
                                            name="malzemeGDZ"
                                            type="text" // از text استفاده می‌کنیم برای کنترل دقیق‌تر
                                            size="small"
                                            value={formatInputNumberForDisplay(newRecordRow.malzemeGDZ, 0)} // برای نمایش عدد صحیح
                                            onChange={handleNewRecordInputChange}
                                            sx={{ width: 70 }}
                                            InputProps={{
                                                sx: {
                                                '& input': { // انتخابگر '& input' عنصر input داخلی را هدف قرار می‌دهد
                                                    textAlign: 'center',
                                                },
                                                },
                                            }}
                                            disabled={loading || isSavingAll || isLoading}
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <CustomTextField
                                            id="new-malzemeYuklenici"
                                            name="malzemeYuklenici"
                                            type="text" // از text استفاده می‌کنیم
                                            size="small"
                                            value={formatInputNumberForDisplay(newRecordRow.malzemeYuklenici, 0)} // برای نمایش عدد صحیح
                                            onChange={handleNewRecordInputChange}
                                            sx={{ width: 70 }}
                                            InputProps={{
                                                sx: {
                                                '& input': { // انتخابگر '& input' عنصر input داخلی را هدف قرار می‌دهد
                                                    textAlign: 'center',
                                                },
                                                },
                                            }}
                                            disabled={loading || isSavingAll || isLoading}
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <CustomTextField
                                            id="new-montaj"
                                            name="montaj"
                                            type="text" // از text استفاده می‌کنیم
                                            size="small"
                                            value={formatInputNumberForDisplay(calculatedNewRecordMontaj, 0)} // برای نمایش عدد صحیح
                                            disabled
                                            sx={{ width: 70 }}
                                            InputProps={{
                                                sx: {
                                                '& input': { // انتخابگر '& input' عنصر input داخلی را هدف قرار می‌دهد
                                                    textAlign: 'center',
                                                },
                                                },
                                            }}
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <CustomTextField
                                            id="new-demontaj"
                                            name="demontaj"
                                            type="text" // از text استفاده می‌کنیم
                                            size="small"
                                            value={formatInputNumberForDisplay(newRecordRow.demontaj, 0)} // برای نمایش عدد صحیح
                                            onChange={handleNewRecordInputChange}
                                            sx={{ width: 70 }}
                                            InputProps={{
                                                sx: {
                                                '& input': { // انتخابگر '& input' عنصر input داخلی را هدف قرار می‌دهد
                                                    textAlign: 'center',
                                                },
                                                },
                                            }}
                                            disabled={loading || isSavingAll || isLoading}
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <CustomTextField
                                            id="new-demontajMontaj" 
                                            name="demontajMontaj" 
                                            type="text" // از text استفاده می‌کنیم
                                            size="small"
                                            value={formatInputNumberForDisplay(newRecordRow.demontajMontaj, 0)} // برای نمایش عدد صحیح
                                            onChange={handleNewRecordInputChange}
                                            sx={{ width: 70 }}
                                            InputProps={{
                                                sx: {
                                                '& input': { // انتخابگر '& input' عنصر input داخلی را هدف قرار می‌دهد
                                                    textAlign: 'center',
                                                },
                                                },
                                            }}
                                            disabled={loading || isSavingAll || isLoading}
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <CustomTextField
                                            id="new-birimFiyatMalzeme"
                                            name="birimFiyatMalzeme"
                                            type="text" // ** تغییر اصلی: از type="text" استفاده می‌کنیم **
                                            size="small"
                                            value={birimFiyatMalzemeNew} // رشته‌ای که کاربر وارد کرده (ممکن است . یا , داشته باشد)
                                            onChange={handleNewRecordInputChange}
                                            sx={{ width: 70 }}
                                            InputProps={{
                                                sx: {
                                                '& input': { // انتخابگر '& input' عنصر input داخلی را هدف قرار می‌دهد
                                                    textAlign: 'center',
                                                },
                                                },
                                            }}
                                            disabled={loading || isSavingAll || isLoading}
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <CustomTextField
                                            id="new-birimFiyatMontaj"
                                            name="birimFiyatMontaj"
                                            type="text" // ** تغییر اصلی: از type="text" استفاده می‌کنیم **
                                            size="small"
                                            value={birimFiyatMontajNew} // رشته‌ای که کاربر وارد کرده
                                            onChange={handleNewRecordInputChange}
                                            sx={{ width: 70 }}
                                            InputProps={{
                                                sx: {
                                                '& input': { // انتخابگر '& input' عنصر input داخلی را هدف قرار می‌دهد
                                                    textAlign: 'center',
                                                },
                                                },
                                            }}
                                            disabled={loading || isSavingAll || isLoading}
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <CustomTextField
                                            id="new-birimFiyatDemontaj"
                                            name="birimFiyatDemontaj"
                                            type="text" // ** تغییر اصلی: از type="text" استفاده می‌کنیم **
                                            size="small"
                                            value={birimFiyatDemontajNew} // رشته‌ای که کاربر وارد کرده
                                            onChange={handleNewRecordInputChange}
                                            sx={{ width: 70 }}
                                            InputProps={{
                                                sx: {
                                                '& input': { // انتخابگر '& input' عنصر input داخلی را هدف قرار می‌دهد
                                                    textAlign: 'center',
                                                },
                                                },
                                            }}
                                            disabled={loading || isSavingAll || isLoading}
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <CustomTextField
                                            id="new-birimFiyatDemontajMontaj"
                                            name="birimFiyatDemontajMontaj"
                                            type="text" // ** تغییر اصلی: از type="text" استفاده می‌کنیم **
                                            size="small"
                                            value={birimFiyatDemontajMontajNew} // رشته‌ای که کاربر وارد کرده
                                            onChange={handleNewRecordInputChange}
                                            sx={{ width: 70 }}
                                            InputProps={{
                                                sx: {
                                                '& input': { // انتخابگر '& input' عنصر input داخلی را هدف قرار می‌دهد
                                                    textAlign: 'center',
                                                },
                                                },
                                            }}
                                            disabled={loading || isSavingAll || isLoading}
                                        />
                                    </TableCell>
                                    <TableCell>
                                        {formatNumber(calculatedNewRecordToplamMalzeme, 2)}
                                    </TableCell>
                                    <TableCell>
                                        {formatNumber(calculatedNewRecordToplamMontaj, 2)}
                                    </TableCell>
                                    <TableCell>
                                        {formatNumber(calculatedNewRecordToplamDemontaj, 2)}
                                    </TableCell>
                                    <TableCell>
                                        {formatNumber(calculatedNewRecordToplamDemontajdanMontaj, 2)}
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
                                            <TableCell sx={{
                                                position: 'sticky', left: 0, zIndex: 2,
                                                backgroundColor: theme.palette.background.paper, borderRight: '1px solid ' + theme.palette.divider,
                                                fontWeight: 'normal',
                                                paddingLeft: '16px'
                                            }}>
                                                {editingRowId === row.id ? (
                                                    <CustomTextField
                                                        type="text"
                                                        size="small"
                                                        value={formatInputNumberForDisplay(editingRowData?.siraNo ?? null, 0)}
                                                        name="siraNo"
                                                        onChange={() => { }}
                                                        sx={{ width: 60 }}
                                            InputProps={{
                                                sx: {
                                                '& input': { // انتخابگر '& input' عنصر input داخلی را هدف قرار می‌دهد
                                                    textAlign: 'center',
                                                },
                                                },
                                            }}
                                                        disabled={true}
                                                    />
                                                ) : (
                                                    row.siraNo.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0, useGrouping: false })
                                                )}
                                            </TableCell>
                                            <TableCell sx={{
                                                position: 'sticky', left: 80, zIndex: 2,
                                                backgroundColor: theme.palette.background.paper,
                                                borderRight: '1px solid ' + theme.palette.divider,
                                                fontWeight: 'normal',
                                                paddingLeft: '16px',
                                                border: (row.isUnregisteredItem ?? false) ? '1px solid ' + theme.palette.error.main : 'none'
                                            }}>
                                                {editingRowId === row.id ? (
                                                    <FormControl fullWidth size="small">
                                                        <Select
                                                            displayEmpty
                                                            value={editingRowSelectedUnifiedNodeId || editingRowData?.description || ''}
                                                            open={isEditingRowTreeSelectOpen}
                                                            onOpen={() => {
                                                                setIsEditingRowTreeSelectOpen(true);
                                                                const foundNode = findNodeByNameAndType(combinedTreeData, editingRowData?.description || '', 'item');
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
                                                            <CustomTooltip placement="right" title="Bu ürün sistemde kayıtlı değil. Lütfen kaydetmeden önce bu ürünü ekleyin.">
                                                                <IconAlertCircle size={18} color={theme.palette.error.main} />
                                                            </CustomTooltip>
                                                        )}
                                                    </Box>
                                                )}
                                            </TableCell>
                                            <TableCell sx={{ borderRight: '1px solid ' + theme.palette.divider }}>
                                                <CustomTextField
                                                    id={`olcuBrimi-${row.id}`}
                                                    name="olcuBrimi"
                                                    type="text"
                                                    size="small"
                                                    value={editingRowId === row.id ? (editingRowData?.olcuBrimi || '') : row.olcuBrimi}
                                                    disabled={true}
                                                    sx={{ width: 90 }}
                                            InputProps={{
                                                sx: {
                                                '& input': { // انتخابگر '& input' عنصر input داخلی را هدف قرار می‌دهد
                                                    textAlign: 'center',
                                                },
                                                },
                                            }}
                                                />
                                            </TableCell>
                                            <TableCell>
                                                {editingRowId === row.id ? (
                                                    <CustomTextField
                                                        type="text" // از text استفاده می‌کنیم
                                                        size="small"
                                                        value={formatInputNumberForDisplay(editingRowData?.malzemeGDZ ?? null, 0)}
                                                        name="malzemeGDZ"
                                                        onChange={handleEditRowInputChange}
                                                        sx={{ width: 70 }}
                                            InputProps={{
                                                sx: {
                                                '& input': { // انتخابگر '& input' عنصر input داخلی را هدف قرار می‌دهد
                                                    textAlign: 'center',
                                                },
                                                },
                                            }}
                                                    />
                                                ) : (
                                                    formatNumber(row.malzemeGDZ, 0)
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                {editingRowId === row.id ? (
                                                    <CustomTextField
                                                        type="text" // از text استفاده می‌کنیم
                                                        size="small"
                                                        value={formatInputNumberForDisplay(editingRowData?.malzemeYuklenici ?? null, 0)}
                                                        name="malzemeYuklenici"
                                                        onChange={handleEditRowInputChange}
                                                        sx={{ width: 70 }}
                                            InputProps={{
                                                sx: {
                                                '& input': { // انتخابگر '& input' عنصر input داخلی را هدف قرار می‌دهد
                                                    textAlign: 'center',
                                                },
                                                },
                                            }}
                                                    />
                                                ) : (
                                                    formatNumber(row.malzemeYuklenici, 0)
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                {editingRowId === row.id ? (
                                                    <CustomTextField
                                                        type="text" // از text استفاده می‌کنیم
                                                        size="small"
                                                        value={formatInputNumberForDisplay(editingRowData?.montaj ?? null, 0)}
                                                        name="montaj"
                                                        disabled
                                                        sx={{ width: 70 }}
                                            InputProps={{
                                                sx: {
                                                '& input': { // انتخابگر '& input' عنصر input داخلی را هدف قرار می‌دهد
                                                    textAlign: 'center',
                                                },
                                                },
                                            }}
                                                    />
                                                ) : (
                                                    formatNumber(row.montaj, 0)
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                {editingRowId === row.id ? (
                                                    <CustomTextField
                                                        type="text" // از text استفاده می‌کنیم
                                                        size="small"
                                                        value={formatInputNumberForDisplay(editingRowData?.demontaj ?? null, 0)}
                                                        name="demontaj"
                                                        onChange={handleEditRowInputChange}
                                                        sx={{ width: 70 }}
                                            InputProps={{
                                                sx: {
                                                '& input': { // انتخابگر '& input' عنصر input داخلی را هدف قرار می‌دهد
                                                    textAlign: 'center',
                                                },
                                                },
                                            }}
                                                    />
                                                ) : (
                                                    formatNumber(row.demontaj, 0)
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                <CustomTextField
                                                    id={`demontajMontaj-${row.id}`}
                                                    name="demontajMontaj"
                                                    type="text" // از text استفاده می‌کنیم
                                                    size="small"
                                                    value={editingRowId === row.id ? formatInputNumberForDisplay(editingRowData?.demontajMontaj ?? null, 0) : formatNumber(row.demontajMontaj, 0)}
                                                    onChange={handleEditRowInputChange}
                                                    sx={{ width: 70 }}
                                            InputProps={{
                                                sx: {
                                                '& input': { // انتخابگر '& input' عنصر input داخلی را هدف قرار می‌دهد
                                                    textAlign: 'center',
                                                },
                                                },
                                            }}
                                                />
                                            </TableCell>
                                            <TableCell>
                                                {editingRowId === row.id ? (
                                                    <CustomTextField
                                                        type="text" // ** تغییر اصلی: از type="text" استفاده می‌کنیم **
                                                        size="small"
                                                        // برای نمایش به کاربر، نقطه رو به کاما تبدیل کن (فقط برای نمایش)
                                                        value={formatInputNumberForDisplay(editingRowData?.birimFiyatMalzeme ?? null, 2)}
                                                        name="birimFiyatMalzeme"
                                                        onChange={handleEditRowInputChange}
                                                        sx={{ width: 70 }}
                                            InputProps={{
                                                sx: {
                                                '& input': { // انتخابگر '& input' عنصر input داخلی را هدف قرار می‌دهد
                                                    textAlign: 'center',
                                                },
                                                },
                                            }}
                                                    />
                                                ) : (
                                                    formatNumber(row.birimFiyatMalzeme, 2)
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                {editingRowId === row.id ? (
                                                    <CustomTextField
                                                        type="text" // ** تغییر اصلی: از type="text" استفاده می‌کنیم **
                                                        size="small"
                                                        value={formatInputNumberForDisplay(editingRowData?.birimFiyatMontaj ?? null, 2)}
                                                        name="birimFiyatMontaj"
                                                        onChange={handleEditRowInputChange}
                                                        sx={{ width: 70 }}
                                            InputProps={{
                                                sx: {
                                                '& input': { // انتخابگر '& input' عنصر input داخلی را هدف قرار می‌دهد
                                                    textAlign: 'center',
                                                },
                                                },
                                            }}
                                                    />
                                                ) : (
                                                    formatNumber(row.birimFiyatMontaj, 2)
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                {editingRowId === row.id ? (
                                                    <CustomTextField
                                                        type="text" // ** تغییر اصلی: از type="text" استفاده می‌کنیم **
                                                        size="small"
                                                        value={formatInputNumberForDisplay(editingRowData?.birimFiyatDemontaj ?? null, 2)}
                                                        name="birimFiyatDemontaj"
                                                        onChange={handleEditRowInputChange}
                                                        sx={{ width: 70 }}
                                            InputProps={{
                                                sx: {
                                                '& input': { // انتخابگر '& input' عنصر input داخلی را هدف قرار می‌دهد
                                                    textAlign: 'center',
                                                },
                                                },
                                            }}
                                                    />
                                                ) : (
                                                    formatNumber(row.birimFiyatDemontaj, 2)
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                {editingRowId === row.id ? (
                                                    <CustomTextField
                                                        type="text" // ** تغییر اصلی: از type="text" استفاده می‌کنیم **
                                                        size="small"
                                                        value={formatInputNumberForDisplay(editingRowData?.birimFiyatDemontajMontaj ?? null, 2)}
                                                        name="birimFiyatDemontajMontaj"
                                                        onChange={handleEditRowInputChange}
                                                        sx={{ width: 70 }}
                                            InputProps={{
                                                sx: {
                                                '& input': { // انتخابگر '& input' عنصر input داخلی را هدف قرار می‌دهد
                                                    textAlign: 'center',
                                                },
                                                },
                                            }}
                                                    />
                                                ) : (
                                                    formatNumber(row.birimFiyatDemontajMontaj, 2)
                                                )}
                                            </TableCell>
                                            <TableCell>{formatNumber(row.toplamMalzeme, 2)}</TableCell>
                                            <TableCell>{formatNumber(row.toplamMontaj, 2)}</TableCell>
                                            <TableCell>{formatNumber(row.toplamDemontaj, 2)}</TableCell>
                                            <TableCell>{formatNumber(row.toplamDemontajdanMontaj, 2)}</TableCell>
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
                                        <TableCell colSpan={15} align="center">
                                            <Typography variant="subtitle1" color="textSecondary">
                                                Henüz detay girişi yapılmadı.
                                            </Typography>
                                        </TableCell>
                                    </TableRow>
                                )}
                                {hasMoreData && filteredGridData.length > displayedGridData.length && (
                                    <TableRow>
                                        <TableCell colSpan={15} align="center">
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
                        <Typography variant="subtitle1" fontWeight="600">Malzeme Toplamı:</Typography>
                        <Typography variant="h5" color="primary">
                            {formatNumber(totalGdz2024MalzemeTutari, 2)}
                        </Typography>
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                        <Typography variant="subtitle1" fontWeight="600">Montaj Toplamı:</Typography>
                        <Typography variant="h5" color="primary">
                            {formatNumber(totalGdz2024MontajTutari, 2)}
                        </Typography>
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                        <Typography variant="subtitle1" fontWeight="600">Demontaj Toplamı:</Typography>
                        <Typography variant="h5" color="primary">
                            {formatNumber(totalGdz2024DemontajTutari, 2)}
                        </Typography>
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                        <Typography variant="subtitle1" fontWeight="600">Demontajdan Montaj Toplamı:</Typography>
                        <Typography variant="h5" color="primary">
                            {formatNumber(totalGdz2024DemontajdanMontajTutari, 2)}
                        </Typography>
                    </Grid>
                    <Grid item xs={12}>
                        <Typography variant="subtitle1" fontWeight="600" mt={2}>
                            Tüm GDZ 2024 YILI TUTARI Toplamı:
                        </Typography>
                        <Typography variant="h4" color="secondary">
                            {formatNumber(totalGdz2024CombinedTutari, 2)}
                        </Typography>
                    </Grid>
                </Grid>
            </Paper>
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