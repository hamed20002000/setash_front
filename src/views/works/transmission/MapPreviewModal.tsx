import React, { useCallback, useState, useEffect, useRef, useMemo } from 'react';
import axios from 'axios';
import server from 'src/assets/address.json';

import {
    Dialog, DialogTitle, DialogContent, DialogActions,
    Button, Typography, Box, Stack, IconButton,
    ToggleButtonGroup, ToggleButton as MuiToggleButton, Tooltip,
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, CircularProgress,
    Divider, Grid
} from '@mui/material';
import { useTheme, styled, Theme } from '@mui/material/styles';
import {
    IconX, IconSelect, IconHandGrab, IconPlus, IconMinus, IconTrash,
    IconLine, IconRotate2, IconPencil, IconMapPin, IconLock, IconLockOpen,
    IconEye
} from '@tabler/icons-react';
import { useTooltip, CustomTooltip } from 'src/context/TooltipContext';
import * as d3 from 'd3-force';
import { toPng } from 'html-to-image';
import AddTransmissionDetailsModal from './AddTransmissionDetailsModal';
import SelectTrafoModal from './SelectTrafoModal';
import SelectProductTypeModal from './SelectProductTypeModal';
import { MapNode, TransmissionRow, SelectOption, AddedItem, ItemType, MiktarTipi, D3MapLink, MapEdge, ProductTypesType } from './types';


import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import Excel from 'exceljs';
import { saveAs } from 'file-saver';
import { IconFileDownload } from '@tabler/icons-react';
import { NotoSansRegular } from 'src/assets/fonts/NotoSans-Regular';

import Logo from 'src/assets/images/logos/logo.png';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';

const formatDateDisplay = (dateString: string | null): string => {
    if (!dateString) return "N/A";
    try {
        return format(new Date(dateString), 'dd MMMM yyyy', { locale: tr });
    } catch {
        return "Geçersiz Tarih";
    }
};


type ToolType = 'select' | 'pan' | 'addNode' | 'addEdge' | 'delete' | 'zoomIn' | 'zoomOut' | 'rotate-drag' | 'edit' | 'addTrafo' | 'viewItems';

const StyledToolButton = styled(MuiToggleButton)(({ theme }) => ({
    '&.Mui-selected': {
        backgroundColor: theme.palette.primary.main,
        color: 'white',
        '&:hover': { backgroundColor: theme.palette.primary.dark },
    },
    '&:not(.Mui-selected)': {
        backgroundColor: theme.palette.background.paper,
        color: theme.palette.text.primary,
        '&:hover': { backgroundColor: theme.palette.action.hover },
    },
    borderRadius: '0px',
    minWidth: 'unset',
    padding: '8px',
}));

const getContrastingTextColor = (theme: Theme) => (theme.palette.mode === 'dark' ? 'white' : 'black');

const linkColors = {
    'Yeni YG': '#4CAF50',
    'Yeni AG': '#FFC107',
    'DMM YG': '#2196F3',
    'DMM AG': '#E91E63',
    'TR-Connection': '#9E9E9E',
};

type NodeStatus = 0 | 1 | 2;

interface MapPreviewModalProps {
    open: boolean;
    onClose: () => void;
    transmissions: TransmissionRow[];
    networkId: string | undefined;
    workId: string | null;
    networkTitle: string;
    onUpdateTransmissions: (newTransmissions: TransmissionRow[]) => void;
    onSaveMapChanges: (updatedTransmissions: TransmissionRow[]) => void;
    allProductTypes: SelectOption[];
    itemsList: ItemType[];
    showAlert: (message: string, severity: 'success' | 'error' | 'warning' | 'info') => void;
    onRegisterNewTrafo: (name: string, type: number) => Promise<void>;
    productTypesList: ProductTypesType[];
    availableTrafoOptionsForMap: SelectOption[];
    availableProductTypeOptionsForMap: SelectOption[];
    nodeStatusByChannelRowId?: Record<string, NodeStatus>;
}

const MapPreviewModal: React.FC<MapPreviewModalProps> = ({
    open,
    onClose,
    transmissions,
    networkId,
    workId,
    networkTitle,
    onSaveMapChanges,
    allProductTypes,
    itemsList,
    showAlert,
    onRegisterNewTrafo,
    productTypesList,
    availableTrafoOptionsForMap,
    availableProductTypeOptionsForMap,
    nodeStatusByChannelRowId,
}) => {
    const theme = useTheme();
    const textColor = getContrastingTextColor(theme);
    const svgContainerRef = useRef<HTMLDivElement>(null);
    const svgElementRef = useRef<SVGSVGElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // ... (States مربوط به D3 بدون تغییر)
    const initialViewWidth = 800;
    const initialViewHeight = 600;
    const [viewBox, setViewBox] = useState({ x: 0, y: 0, width: initialViewWidth, height: initialViewHeight });
    const [scale, setScale] = useState(1);
    const [rotationAngle, setRotationAngle] = useState(0);
    const [activeTool, setActiveTool] = useState<ToolType>('select');
    const [isRotating, setIsRotating] = useState(false);
    const [rotateStartMousePos, setRotateStartMousePos] = useState({ x: 0, y: 0 });
    const [rotateStartAngle, setRotateStartAngle] = useState(0);
    const [selectedNodeIds, setSelectedNodeIds] = useState<Set<string>>(new Set());
    const [selectedEdgeIds, setSelectedEdgeIds] = useState<Set<string>>(new Set());
    const [drawingEdgeStartNode, setDrawingEdgeStartNode] = useState<MapNode | null>(null);
    const [isDraggingNode, setIsDraggingNode] = useState<boolean>(false);
    const [draggedNodeId, setDraggedNodeId] = useState<string | null>(null);
    const [isPanning, setIsPanning] = useState<boolean>(false);
    const [panStartMousePos, setPanStartMousePos] = useState({ x: 0, y: 0 });
    const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
    const [editingEdgeId, setEditingEdgeId] = useState<string | null>(null);
    const [editValue, setEditValue] = useState<string>('');
    const [isDistanceLocked, setIsDistanceLocked] = useState(false);
    const [mapNodes, setMapNodes] = useState<MapNode[]>([]);
    const [mapEdges, setMapEdges] = useState<MapEdge[]>([]);
    const [openDetailsModal, setOpenDetailsModal] = useState(false);
    const [tempTransmissionData, setTempTransmissionData] = useState<{ fromNode: MapNode; toNode: MapNode; } | null>(null);
    const [isTrafoModalOpen, setIsTrafoModalOpen] = useState(false);
    const [isProductTypeModalOpen, setIsProductTypeModalOpen] = useState(false);


    const { isTooltipGloballyEnabled } = useTooltip();

    const [isLeftDrawerOpen, setIsLeftDrawerOpen] = useState(false);
    const [isRightDrawerOpen, setIsRightDrawerOpen] = useState(false);

    // --- State برای مشاهده آیتم‌ها ---
    const [viewItemsModalOpen, setViewItemsModalOpen] = useState(false);
    const [viewItemsData, setViewItemsData] = useState<any[]>([]);
    const [viewItemsLoading, setViewItemsLoading] = useState(false);
    const [viewItemsTitle, setViewItemsTitle] = useState('');

    const svgGroupRef = useRef<SVGGElement>(null);
    const MIN_NODE_GAP = 80;

    const getCenterOfViewBox = useCallback(() => ({ x: viewBox.x + viewBox.width / 2, y: viewBox.y + viewBox.height / 2 }), [viewBox]);
    const getAngle = useCallback((p1: { x: number; y: number }, p2: { x: number; y: number }) => Math.atan2(p2.y - p1.y, p2.x - p1.x) * 180 / Math.PI, []);
    const getSvgCoordinates = useCallback((clientX: number, clientY: number) => {
        const svg = svgElementRef.current;
        const g = svgGroupRef.current;
        if (!svg) return { x: 0, y: 0 };
        const pt = svg.createSVGPoint();
        pt.x = clientX; pt.y = clientY;
        const ctm = (g?.getScreenCTM && g.getScreenCTM()) || svg.getScreenCTM();
        if (!ctm) return { x: 0, y: 0 };
        const inv = ctm.inverse();
        const p = pt.matrixTransform(inv);
        return { x: p.x, y: p.y };
    }, []);
    // const getMaterialSymbol = (ptcat?: 1 | 2) => (ptcat === 1 ? '🧱' : ptcat === 2 ? '⚙️' : '');

    const getMaterialSymbol = (ptcat?: any) => {
        debugger
        const category = Number(ptcat);
        if (category === 1) return '🧱';
        if (category === 2) return '⚙️';
        return '';
    };

    const getNodeStatus = useCallback((nodeId: string, _fallbackMiktarTipi?: MiktarTipi): NodeStatus => {
        if (nodeStatusByChannelRowId && nodeStatusByChannelRowId[nodeId as keyof typeof nodeStatusByChannelRowId] !== undefined) {
            return nodeStatusByChannelRowId[nodeId as keyof typeof nodeStatusByChannelRowId] as NodeStatus;
        }
        const incoming = mapEdges.find(e => e.toNodeId === nodeId && e.miktarTipi !== 'TR-Connection');
        if (incoming) {
            if (String(incoming.miktarTipi).toLowerCase().includes('dmm')) return 1;
            return 0;
        }
        return 0;
    }, [nodeStatusByChannelRowId, mapEdges]);
    const calculatedTotals = useMemo(() => {
        const groups: Record<string, { totalQuantity: number; totalUnitWeights: number }> = {};

        viewItemsData.forEach(item => {
            const qty = parseFloat(item.quantity) || 0;
            const unitWeight = parseFloat(item.weight) || 0;
            const unit = item.unit || 'Diğer';

            if (!groups[unit]) {
                groups[unit] = { totalQuantity: 0, totalUnitWeights: 0 };
            }

            groups[unit].totalQuantity += qty;
            groups[unit].totalUnitWeights += unitWeight;
        });

        const finalRows: Record<string, { totalQuantity: number; totalUnitWeights: number; rowTotal: number }> = {};
        let grandTotalWeight = 0;

        Object.entries(groups).forEach(([unit, data]) => {
            let calculatedRowTotal = data.totalQuantity * data.totalUnitWeights;
            if (unit.toLowerCase() === 'kg' && data.totalUnitWeights === 0) {
                calculatedRowTotal = data.totalQuantity;
            }

            finalRows[unit] = {
                totalQuantity: data.totalQuantity,
                totalUnitWeights: data.totalUnitWeights,
                rowTotal: calculatedRowTotal
            };

            grandTotalWeight += calculatedRowTotal;
        });

        return { finalRows, grandTotalWeight };
    }, [viewItemsData]);


    const handleFetchNodeItems = async (nodeId: string, nodeName: string) => {
        if (!workId) {
            showAlert("İş ID'si bulunamadı.", "error");
            return;
        }
        setViewItemsLoading(true);
        setViewItemsTitle(`${nodeName} İçin Malzemeler`);
        setViewItemsModalOpen(true);
        setViewItemsData([]);

        const authToken = localStorage.getItem('authToken');
        try {
            const response = await axios.get(
                `${server.baseurl}${server.initialoperations}get-network-by-work-id/${workId}`,
                { headers: { "Authorization": `Bearer ${authToken}` } }
            );

            if (response.data.success && response.data.data) {
                const data = response.data.data;
                let foundItems: any[] = [];

                if (data.networkTrAdis && Array.isArray(data.networkTrAdis)) {
                    for (const trAdi of data.networkTrAdis) {
                        if (trAdi.channelRows && Array.isArray(trAdi.channelRows)) {
                            const targetRow = trAdi.channelRows.find((row: any) =>
                                String(row.id) === String(nodeId)
                            );
                            if (targetRow && targetRow.channelRowItems) {
                                foundItems = targetRow.channelRowItems;
                                break;
                            }
                        }
                    }
                }

                const formattedItems = foundItems.map((item: any) => ({
                    id: item.id,
                    name: item.item?.name,
                    quantity: item.value,
                    unit: item.item?.unit?.title,
                    weight: item.item?.weghit
                }));

                setViewItemsData(formattedItems);
                if (formattedItems.length === 0) {
                    showAlert("Bu düğüm için kayıtlı malzeme bulunamadı.", "info");
                }
            } else {
                showAlert("Veri alınamadı.", "error");
            }
        } catch (error) {
            console.error("Error fetching node items:", error);
            showAlert("Sunucudan veri alınırken hata oluştu.", "error");
        } finally {
            setViewItemsLoading(false);
        }
    };

    const handleFetchEdgeItems = async (edgeId: string) => {
        if (!networkId) {
            showAlert("Şebeke ID'si bulunamadı.", "error");
            return;
        }
        setViewItemsLoading(true);
        setViewItemsTitle(`Hat İçin Malzemeler`);
        setViewItemsModalOpen(true);
        setViewItemsData([]);

        const authToken = localStorage.getItem('authToken');
        try {
            const response = await axios.get(
                server.baseurl + server.initialoperations + `get-transmission-row-by-network-id/${networkId}`,
                { headers: { "Authorization": `Bearer ${authToken}` } }
            );

            if (response.data.success && response.data.data && response.data.data.transmissionRows) {
                const row = response.data.data.transmissionRows.find((r: any) => String(r.id) === String(edgeId));

                if (row && row.transmissionRowItmes) {
                    const formattedItems = row.transmissionRowItmes.map((item: any) => ({
                        id: item.id,
                        name: item.item?.name,
                        quantity: item.value,
                        unit: item.item?.unit?.title,
                        weight: item.item?.weghit
                    }));
                    setViewItemsData(formattedItems);
                } else {
                    const localEdge = mapEdges.find(e => e.id === edgeId);
                    if (localEdge && localEdge.items && localEdge.items.length > 0) {
                        const localFormatted = localEdge.items.map(item => ({
                            id: item.id,
                            name: item.name,
                            quantity: item.quantity,
                            unit: item.unit?.title || '',
                            weight: item.weight
                        }));
                        setViewItemsData(localFormatted);
                    } else {
                        showAlert("Bu hat için kayıtlı malzeme bulunamadı (veya henüz kaydedilmedi).", "info");
                    }
                }
            }
        } catch (error) {
            console.error("Error fetching edge items:", error);
            showAlert("Sunucudan veri alınırken hata oluştu.", "error");
        } finally {
            setViewItemsLoading(false);
        }
    };

    const handleNodeClick = useCallback((node: MapNode, e: React.MouseEvent<SVGCircleElement>) => {
        e.stopPropagation();
        if (activeTool === 'select') {
            setSelectedNodeIds(new Set([node.id])); setSelectedEdgeIds(new Set());
        } else if (activeTool === 'edit') {
            if (!node.isHub) { setEditingNodeId(node.id); setIsProductTypeModalOpen(true); }
        } else if (activeTool === 'delete') {
            if (!node.isHub) {
                setMapNodes(prev => prev.filter(n => n.id !== node.id));
                setMapEdges(prev => prev.filter(e => e.fromNodeId !== node.id && e.toNodeId !== node.id));
            } else { showAlert('TRAFO silinemez, bağlantıları silinmeli.', 'warning'); }
            setSelectedNodeIds(new Set()); setSelectedEdgeIds(new Set());
        } else if (activeTool === 'viewItems') {
            handleFetchNodeItems(node.id, node.name);
        }
    }, [activeTool, showAlert, workId]);

    const handleEdgeClick = useCallback((edge: MapEdge, e: React.MouseEvent<SVGLineElement>) => {
        e.stopPropagation();
        if (activeTool === 'select') {
            setSelectedEdgeIds(new Set([edge.id])); setSelectedNodeIds(new Set());
        } else if (activeTool === 'edit') {
            setEditingEdgeId(edge.id); setEditValue(String(edge.distance)); setEditingNodeId(null); setSelectedEdgeIds(new Set([edge.id])); setSelectedNodeIds(new Set());
        } else if (activeTool === 'delete') {
            setMapEdges(prev => prev.filter(e => e.id !== edge.id)); setSelectedNodeIds(new Set()); setSelectedEdgeIds(new Set());
        } else if (activeTool === 'viewItems') {
            handleFetchEdgeItems(edge.id);
        }
    }, [activeTool, networkId]);

    const convertTransmissionsToMapData = useCallback((currentTransmissions: TransmissionRow[]) => {
        debugger
        const nodesMap = new Map<string, MapNode>();
        const links: D3MapLink[] = [];




        const detailsLookup = new Map(allProductTypes.map(opt => [opt.id, opt]));
        const productTypeDetailsMap = new Map(productTypesList.map(p => [String(p.id), p]));

        currentTransmissions.forEach(t => {
            const fromId = String(t.fromProductTypeId || '');
            const toId = String(t.toProductTypeId || '');

            const fromDetails = detailsLookup.get(fromId);
            const toDetails = detailsLookup.get(toId);

            const fromTechDetails = productTypeDetailsMap.get(fromId);
            const toTechDetails = productTypeDetailsMap.get(toId);

            const fromUniqueKey = fromId || `${t.fromProductType}_${fromDetails?.groupId || 'nogroup'}`;
            const toUniqueKey = toId || `${t.toProductType}_${toDetails?.groupId || 'nogroup'}`;

            if (!nodesMap.has(fromUniqueKey)) {
                const isTrafo = fromDetails?.type === 0;
                nodesMap.set(fromUniqueKey, {
                    id: fromId || fromUniqueKey,
                    name: t.fromProductType,
                    x: t.fromProductTypeX,
                    y: t.fromProductTypeY,
                    fx: t.fromProductTypeX,
                    fy: t.fromProductTypeY,
                    isNew: !fromId,
                    isHub: isTrafo,
                    groupId: fromDetails?.groupId,
                    productTypeCategory: fromTechDetails?.type as 1 | 2 | undefined,
                });
            }
            if (!nodesMap.has(toUniqueKey)) {
                const isTrafo = toDetails?.type === 0;
                nodesMap.set(toUniqueKey, {
                    id: toId || toUniqueKey,
                    name: t.toProductType,
                    x: t.toProductTypeX,
                    y: t.toProductTypeY,
                    fx: t.toProductTypeX,
                    fy: t.toProductTypeY,
                    isNew: !toId,
                    isHub: isTrafo,
                    groupId: toDetails?.groupId,
                    productTypeCategory: toTechDetails?.type as 1 | 2 | undefined,
                });
            }
        });

        const hubs = Array.from(nodesMap.values()).filter(n => n.isHub);
        const totalHubs = hubs.length;

        hubs.forEach((hub, index) => {
            if (hub.x === undefined || hub.y === undefined) {
                const sectionWidth = initialViewWidth / (totalHubs + 1);
                const xPos = sectionWidth * (index + 1);

                hub.fx = xPos;
                hub.fy = initialViewHeight / 2;
                hub.x = xPos;
                hub.y = initialViewHeight / 2;
            }
        });
        currentTransmissions.forEach(t => {
            const fromId = String(t.fromProductTypeId || '');
            const toId = String(t.toProductTypeId || '');
            const fromDetails = detailsLookup.get(fromId);
            const toDetails = detailsLookup.get(toId);

            const fromUniqueKey = fromId || `${t.fromProductType}_${fromDetails?.groupId || 'nogroup'}`;
            const toUniqueKey = toId || `${t.toProductType}_${toDetails?.groupId || 'nogroup'}`;

            const fromNode = nodesMap.get(fromUniqueKey);
            const toNode = nodesMap.get(toUniqueKey);

            if (fromNode && toNode) {
                const isConnectionToHub = fromNode.isHub || toNode.isHub;
                const newMiktarTipi: MiktarTipi = isConnectionToHub ? 'TR-Connection' : (t.miktarTipi as MiktarTipi);

                links.push({
                    id: t.id,
                    source: fromNode,
                    target: toNode,
                    distance: t.distance,
                    miktarTipi: newMiktarTipi,
                    formulaTitle: t.formulaTitle,
                    items: t.items
                });
            }
        });

        return { nodes: Array.from(nodesMap.values()), links };
    }, [initialViewHeight, initialViewWidth, productTypesList, allProductTypes]);


    const applyForceLayout = useCallback((nodes: MapNode[], links: D3MapLink[], runSimulation: boolean) => {
        if (!runSimulation) {
            return {
                nodes,
                edges: links.map(link => {
                    const s = link.source as MapNode;
                    const t = link.target as MapNode;
                    return {
                        id: link.id,
                        fromNodeId: s.id,
                        toNodeId: t.id,
                        fromX: s.x || 0,
                        fromY: s.y || 0,
                        toX: t.x || 0,
                        toY: t.y || 0,
                        distance: link.distance,
                        miktarTipi: link.miktarTipi,
                        formulaTitle: link.formulaTitle,
                        items: link.items
                    };
                })
            };
        }
        const uniqueGroups = Array.from(new Set(nodes.map(n => n.groupId).filter(Boolean)));
        const groupCount = uniqueGroups.length;

        const getGroupX = (node: MapNode) => {
            if (!node.groupId || groupCount <= 1) return initialViewWidth / 2;

            const index = uniqueGroups.indexOf(node.groupId);

            return (initialViewWidth / (groupCount + 1)) * (index + 1);
        };
        const simulation = d3.forceSimulation(nodes)
            .force('link', d3.forceLink<MapNode, D3MapLink>(links).id(d => d.id).distance(120))

            .force('charge', d3.forceManyBody().strength(-1000))

            .force('collide', d3.forceCollide(MIN_NODE_GAP / 1.5))

            .force('x', d3.forceX().x(d => getGroupX(d as MapNode)).strength(0.8))

            .force('y', d3.forceY().y(initialViewHeight / 2).strength(0.1));

        simulation.stop();
        const iters = Math.min(300, Math.max(100, nodes.length * 20));
        for (let i = 0; i < iters; ++i) simulation.tick();

        const resolveOverlaps = (arr: MapNode[]) => {
            let changed = false;
            for (let i = 0; i < arr.length; i++) {
                for (let j = i + 1; j < arr.length; j++) {
                    const a = arr[i], b = arr[j];
                    const ax = a.x ?? 0, ay = a.y ?? 0, bx = b.x ?? 0, by = b.y ?? 0;
                    let dx = bx - ax, dy = by - ay;
                    let d = Math.hypot(dx, dy);
                    const minD = Math.max(MIN_NODE_GAP, (a.isHub || b.isHub) ? MIN_NODE_GAP + 20 : MIN_NODE_GAP);

                    if (d < minD && d > 0) {
                        const push = (minD - d) / 2;
                        dx /= d; dy /= d;
                        a.x = ax - dx * push; a.y = ay - dy * push;
                        b.x = bx + dx * push; b.y = by + dy * push;
                        changed = true;
                    }
                }
            }
            return changed;
        };

        // چند بار تلاش برای رفع همپوشانی نهایی
        for (let k = 0; k < 5; k++) { if (!resolveOverlaps(nodes)) break; }

        // اطمینان از اینکه همه نودها مختصات دارند (اگر NaN شد، وسط صفحه بگذار)
        const updatedNodes = nodes.map(n => ({
            ...n,
            x: n.x && !isNaN(n.x) ? n.x : initialViewWidth / 2,
            y: n.y && !isNaN(n.y) ? n.y : initialViewHeight / 2
        }));

        return {
            nodes: updatedNodes,
            edges: links.map(link => {
                const sId = (link.source as MapNode).id;
                const tId = (link.target as MapNode).id;
                // پیدا کردن مختصات نهایی سورس و تارگت
                const s = updatedNodes.find(n => n.id === sId) || (link.source as MapNode);
                const t = updatedNodes.find(n => n.id === tId) || (link.target as MapNode);

                return {
                    id: link.id,
                    fromNodeId: s.id,
                    toNodeId: t.id,
                    fromX: s.x || 0,
                    fromY: s.y || 0,
                    toX: t.x || 0,
                    toY: t.y || 0,
                    distance: link.distance,
                    miktarTipi: link.miktarTipi,
                    formulaTitle: link.formulaTitle,
                    items: link.items
                };
            })
        };
    }, [initialViewHeight, initialViewWidth, MIN_NODE_GAP]);


    useEffect(() => {
        if (!open) {
            setMapNodes([]); setMapEdges([]);
            setViewBox({ x: 0, y: 0, width: initialViewWidth, height: initialViewHeight });
            setScale(1); setRotationAngle(0); setActiveTool('select');
            return;
        }
        setActiveTool('select');
        if (transmissions.length > 0) {
            const { nodes, links } = convertTransmissionsToMapData(transmissions);
            const hasInitialCoordinates = nodes.some(n => n.x !== undefined && n.y !== undefined);
            let runSim = !hasInitialCoordinates;
            if (!runSim) {
                let minDist = Infinity;
                for (let i = 0; i < nodes.length; i++) {
                    for (let j = i + 1; j < nodes.length; j++) {
                        const dx = (nodes[i].x ?? 0) - (nodes[j].x ?? 0);
                        const dy = (nodes[i].y ?? 0) - (nodes[j].y ?? 0);
                        const d = Math.sqrt(dx * dx + dy * dy);
                        if (d < minDist) minDist = d;
                    }
                }
                if (minDist < 40) runSim = true;
            }
            const layouted = applyForceLayout(nodes, links, runSim);
            setMapNodes(layouted.nodes);
            setMapEdges(layouted.edges);

            if (svgContainerRef.current && layouted.nodes.length > 0) {
                const xs = layouted.nodes.map(n => n.x || initialViewWidth / 2);
                const ys = layouted.nodes.map(n => n.y || initialViewHeight / 2);
                const minX = Math.min(...xs) - 50;
                const minY = Math.min(...ys) - 50;
                const maxX = Math.max(...xs) + 50;
                const maxY = Math.max(...ys) + 50;
                setViewBox({ x: minX, y: minY, width: maxX - minX, height: maxY - minY });
            } else {
                setViewBox({ x: 0, y: 0, width: initialViewWidth, height: initialViewHeight });
            }
        } else {
            setMapNodes([]); setMapEdges([]);
            setViewBox({ x: 0, y: 0, width: initialViewWidth, height: initialViewHeight });
        }
    }, [open, transmissions, convertTransmissionsToMapData, applyForceLayout, initialViewWidth, initialViewHeight]);

    const handleTextClick = useCallback((id: string, type: 'node' | 'edge', value: string, e: React.MouseEvent<SVGTextElement>) => {
        e.stopPropagation();
        if (activeTool === 'edit') {
            if (type === 'node') {
                const node = mapNodes.find(n => n.id === id);
                if (node && !node.isHub) {
                    setEditingNodeId(id);
                    setIsProductTypeModalOpen(true);
                    setEditingEdgeId(null);
                    setSelectedNodeIds(new Set([id]));
                    setSelectedEdgeIds(new Set());
                }
            } else {
                setEditingEdgeId(id);
                setEditValue(value);
                setEditingNodeId(null);
                setSelectedEdgeIds(new Set([id]));
                setSelectedNodeIds(new Set());
            }
        }
    }, [activeTool, mapNodes]);

    const handleEdgeDistanceChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const v = e.target.value;
        if (/^\d*([.]\d{0,2})?$/.test(v) || v === '') setEditValue(v);
    }, []);

    const handleEdgeDistanceSave = useCallback(() => {
        if (editingEdgeId) {
            const newDistance = parseFloat(editValue);
            if (!isNaN(newDistance) && newDistance >= 0) {
                setMapEdges(prev => prev.map(edge => edge.id === editingEdgeId ? { ...edge, distance: newDistance } : edge));
            } else {
                showAlert('Geçersiz mesafe değeri girildi.', 'warning');
            }
            setEditingEdgeId(null);
            setEditValue('');
        }
    }, [editingEdgeId, editValue, showAlert]);

    const handleEdgeDistanceBlur = useCallback(() => { if (editingEdgeId) handleEdgeDistanceSave(); }, [editingEdgeId, handleEdgeDistanceSave]);
    const handleEdgeDistanceKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => { e.stopPropagation(); if (e.key === 'Enter') handleEdgeDistanceSave(); if (e.key === 'Escape') { setEditingEdgeId(null); setEditValue(''); } }, [handleEdgeDistanceSave]);



    ////////////////////////////////////////////////////////////


    const handleMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
        e.preventDefault();
        if ((editingNodeId || editingEdgeId) && inputRef.current && !inputRef.current.contains(e.target as Node)) {
            if (editingEdgeId) handleEdgeDistanceSave();
            setEditingNodeId(null);
            setEditingEdgeId(null);
            setEditValue('');
            return;
        }
        if (activeTool === 'addNode') { setIsProductTypeModalOpen(true); return; }
        if (activeTool === 'addTrafo') { setIsTrafoModalOpen(true); return; }

        if (activeTool === 'pan') {
            setIsPanning(true);
            setPanStartMousePos({ x: e.clientX, y: e.clientY });
        } else if (activeTool === 'select') {
            if (e.target instanceof Element && (e.target.tagName === 'circle' || e.target.tagName === 'path')) {
                const nodeId = (e.target.tagName === 'circle' ? e.target.getAttribute('id') : e.target.closest('g')?.querySelector('circle')?.getAttribute('id')) || '';
                const node = mapNodes.find(n => n.id === nodeId);
                if (node) { setIsDraggingNode(true); setDraggedNodeId(node.id); }
            } else {
                setSelectedNodeIds(new Set());
                setSelectedEdgeIds(new Set());
            }
        } else if (activeTool === 'addEdge') {
            if (e.target instanceof Element && (e.target.tagName === 'circle' || e.target.tagName === 'path')) {
                const nodeId = (e.target.tagName === 'circle' ? e.target.getAttribute('id') : e.target.closest('g')?.querySelector('circle')?.getAttribute('id')) || '';
                const node = mapNodes.find(n => n.id === nodeId);
                if (node) {
                    if (!drawingEdgeStartNode) {
                        setDrawingEdgeStartNode(node);
                    } else if (drawingEdgeStartNode.id === node.id) {
                        setDrawingEdgeStartNode(null);
                    } else {
                        // if (drawingEdgeStartNode.isHub && node.isHub) { showAlert('Bir TRAFO başka bir TRAFOya bağlanamaz.', 'warning'); setDrawingEdgeStartNode(null); return; }
                        // const exists = mapEdges.some(e => (e.fromNodeId === drawingEdgeStartNode.id && e.toNodeId === node.id) || (e.fromNodeId === node.id && e.toNodeId === drawingEdgeStartNode.id));
                        // if (exists) { showAlert('Bu bağlantı zaten mevcut.', 'warning'); setDrawingEdgeStartNode(null); return; }
                        setTempTransmissionData({ fromNode: drawingEdgeStartNode, toNode: node });
                        // setOpenDetailsModal(true);
                        // setDrawingEdgeStartNode(null);

                        const startGroup = drawingEdgeStartNode.groupId;
                        const endGroup = node.groupId;

                        // اگر هر دو نود دارای گروه باشند و گروه‌ها متفاوت باشند
                        if (startGroup && endGroup && startGroup !== endGroup) {
                            showAlert('Farklı TRAFO bölgeleri birbirine bağlanamaz!', 'warning'); // اخطار: مناطق مختلف ترافو نمی‌توانند به هم وصل شوند
                            setDrawingEdgeStartNode(null);
                            return;
                        }

                        if (drawingEdgeStartNode.isHub && node.isHub) {
                            showAlert('Bir TRAFO başka bir TRAFOya bağlanamaz.', 'warning');
                            setDrawingEdgeStartNode(null);
                            return;
                        }
                    }
                }
            }
        } else if (activeTool === 'rotate-drag') {
            setIsRotating(true);
            setRotateStartMousePos({ x: e.clientX, y: e.clientY });
            setRotateStartAngle(rotationAngle);
        } else if (activeTool === 'edit' || activeTool === 'delete') {
            if (!(e.target instanceof Element && ['circle', 'line', 'text', 'input', 'foreignObject', 'path'].includes(e.target.tagName))) {
                setEditingNodeId(null);
                setEditingEdgeId(null);
                setEditValue('');
                setSelectedNodeIds(new Set());
                setSelectedEdgeIds(new Set());
            }
        }
    }, [activeTool, mapNodes, drawingEdgeStartNode, editingNodeId, editingEdgeId, handleEdgeDistanceSave, rotationAngle, mapEdges, showAlert]);

    const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
        if (isPanning) {
            const dx = (e.clientX - panStartMousePos.x) / scale;
            const dy = (e.clientY - panStartMousePos.y) / scale;
            setViewBox(prev => ({ ...prev, x: prev.x - dx, y: prev.y - dy }));
            setPanStartMousePos({ x: e.clientX, y: e.clientY });
        } else if (isDraggingNode && draggedNodeId) {
            const { x, y } = getSvgCoordinates(e.clientX, e.clientY);
            const updated = mapNodes.map(n => n.id === draggedNodeId ? { ...n, x, y } : n);
            setMapNodes(updated);
            setMapEdges(prev => prev.map(edge => {
                if (edge.fromNodeId === draggedNodeId || edge.toNodeId === draggedNodeId) {
                    const from = updated.find(n => n.id === edge.fromNodeId);
                    const to = updated.find(n => n.id === edge.toNodeId);
                    if (from && to) {
                        const newEdge = { ...edge };
                        newEdge.fromX = from.x || 0; newEdge.fromY = from.y || 0;
                        newEdge.toX = to.x || 0; newEdge.toY = to.y || 0;
                        if (!isDistanceLocked) {
                            newEdge.distance = parseFloat(Math.hypot(newEdge.fromX - newEdge.toX, newEdge.fromY - newEdge.toY).toFixed(2));
                        }
                        return newEdge;
                    }
                }
                return edge;
            }));
        } else if (activeTool === 'addEdge' && drawingEdgeStartNode) {
            setPanStartMousePos({ x: e.clientX, y: e.clientY });
        } else if (isRotating && activeTool === 'rotate-drag') {
            const center = getCenterOfViewBox();
            const start = getAngle(getSvgCoordinates(rotateStartMousePos.x, rotateStartMousePos.y), center);
            const cur = getAngle(getSvgCoordinates(e.clientX, e.clientY), center);
            setRotationAngle(rotateStartAngle + (cur - start));
        }
    }, [isPanning, panStartMousePos, scale, isDraggingNode, draggedNodeId, mapNodes, drawingEdgeStartNode, activeTool, getSvgCoordinates, getCenterOfViewBox, isRotating, rotateStartMousePos, rotateStartAngle, getAngle, isDistanceLocked]);

    const handleMouseUp = useCallback(() => {
        setIsPanning(false);
        setIsDraggingNode(false);
        setDraggedNodeId(null);
        setIsRotating(false);
    }, []);

    const handleZoom = useCallback((zoomFactor: number) => {
        const cx = viewBox.x + viewBox.width / 2;
        const cy = viewBox.y + viewBox.height / 2;
        const w = viewBox.width / zoomFactor;
        const h = viewBox.height / zoomFactor;
        setViewBox({ x: cx - w / 2, y: cy - h / 2, width: w, height: h });
        setScale(prev => prev * zoomFactor);
    }, [viewBox]);

    const handleWheel = useCallback((e: React.WheelEvent<HTMLDivElement>) => {
        e.preventDefault();
        const zoomFactor = 1.1;
        const svgPts = getSvgCoordinates(e.clientX, e.clientY);
        const newW = viewBox.width / (e.deltaY < 0 ? zoomFactor : 1 / zoomFactor);
        const newH = viewBox.height / (e.deltaY < 0 ? zoomFactor : 1 / zoomFactor);
        setViewBox({
            x: svgPts.x - (svgPts.x - viewBox.x) * (newW / viewBox.width),
            y: svgPts.y - (svgPts.y - viewBox.y) * (newH / viewBox.height),
            width: newW, height: newH
        });
        setScale(prev => prev * (e.deltaY < 0 ? zoomFactor : 1 / zoomFactor));
    }, [viewBox, getSvgCoordinates]);

    const handleSaveTransmissionDetails = useCallback((fromNode: MapNode, toNode: MapNode, distance: number, miktarTipi: MiktarTipi, formulaTitle: string, addedItems: AddedItem[]) => {
        const exists = mapEdges.some(e => (e.fromNodeId === fromNode.id && e.toNodeId === toNode.id) || (e.fromNodeId === toNode.id && e.toNodeId === fromNode.id));
        if (exists) { showAlert('Bu iletim zaten mevcut.', 'warning'); return; }
        const newEdge: MapEdge = {
            id: `edge-${Date.now()}`,
            fromNodeId: fromNode.id, toNodeId: toNode.id,
            fromX: fromNode.x || 0, fromY: fromNode.y || 0,
            toX: toNode.x || 0, toY: toNode.y || 0,
            distance, miktarTipi, formulaTitle, items: addedItems,
        };
        setMapEdges(prev => [...prev, newEdge]);
        setOpenDetailsModal(false);
        showAlert('Yeni iletim haritaya eklendi.', 'success');
    }, [mapEdges, showAlert]);

    const handleSelectProductType = useCallback((productType: SelectOption) => {
        const productTypeInApi = productTypesList.find(p => p.id === productType.id);

        if (editingNodeId) {
            const editedNode = mapNodes.find(n => n.id === editingNodeId);
            if (!editedNode) return;
            const isDup = mapNodes.some(node => node.id !== editedNode.id && node.name.toLowerCase() === productType.name.toLowerCase());
            if (isDup) { showAlert('Bu isimde bir düğüm zaten var.', 'warning'); return; }
            const updatedNodes = mapNodes.map(node => node.id === editedNode.id ? {
                ...node, id: productType.id, name: productType.name,
                isNew: !productTypeInApi || productType.id.startsWith('temp-'),
                productTypeCategory: productTypeInApi?.type as 1 | 2 | undefined,
            } : node);
            const updatedEdges = mapEdges.map(edge => {
                if (edge.fromNodeId === editedNode.id) return { ...edge, fromNodeId: productType.id };
                if (edge.toNodeId === editedNode.id) return { ...edge, toNodeId: productType.id };
                return edge;
            });
            setMapNodes(updatedNodes);
            setMapEdges(updatedEdges);
        } else {
            const isAlready = mapNodes.some(node => String(node.id) === productType.id);
            if (isAlready) { showAlert('Bu ürün tipi zaten haritada mevcut.', 'warning'); setIsProductTypeModalOpen(false); return; }
            const newNode: MapNode = {
                id: productType.id, name: productType.name, isHub: false, isNew: !productTypeInApi || productType.id.startsWith('temp-'),
                x: undefined, y: undefined, fx: undefined, fy: undefined, productTypeCategory: productTypeInApi?.type as 1 | 2 | undefined,
            };
            const buffer = 180;
            let newX: number | undefined, newY: number | undefined;
            let ok = false; let tries = 0;
            while (!ok && tries < 60) {
                const px = (viewBox.x + viewBox.width / 2) + (Math.random() - 0.5) * (viewBox.width / 1.5);
                const py = (viewBox.y + viewBox.height / 2) + (Math.random() - 0.5) * (viewBox.height / 1.5);
                const far = mapNodes.every(n => { const dx = px - (n.x || 0), dy = py - (n.y || 0); return Math.sqrt(dx * dx + dy * dy) > buffer; });
                if (far) { newX = px; newY = py; ok = true; }
                tries++;
            }
            newNode.x = newX || (viewBox.x + viewBox.width / 2);
            newNode.y = newY || (viewBox.y + viewBox.height / 2);
            showAlert(ok ? 'Yeni ürün tipi haritaya eklendi. Konumunu değiştirmek için sürükleyebilirsiniz.' : 'Uygun konum bulunamadı, ürün tipi merkeze eklendi.', ok ? 'success' : 'info');
            setMapNodes(prev => [...prev, newNode]);
        }
        setIsProductTypeModalOpen(false);
        setEditingNodeId(null);
    }, [editingNodeId, mapNodes, mapEdges, productTypesList, showAlert, viewBox]);

    const handleSelectNewTrafo = useCallback((trafo: SelectOption) => {
        const isTrafoAlready = mapNodes.some(node => String(node.id) === trafo.id);
        if (isTrafoAlready) { showAlert('Bu TRAFO zaten haritada mevcut.', 'warning'); setIsTrafoModalOpen(false); return; }
        const trafoDetails = productTypesList.find(p => p.id === trafo.id);
        const newTrafoNode: MapNode = {
            id: trafo.id, name: trafo.name, isHub: true, isNew: false, x: undefined, y: undefined, fx: undefined, fy: undefined, productTypeCategory: trafoDetails?.type as 1 | 2 | undefined,
        };
        const buffer = 200;
        let newX: number | undefined, newY: number | undefined;
        let ok = false; let tries = 0;
        while (!ok && tries < 60) {
            const px = (viewBox.x + viewBox.width / 2) + (Math.random() - 0.5) * (viewBox.width / 1.5);
            const py = (viewBox.y + viewBox.height / 2) + (Math.random() - 0.5) * (viewBox.height / 1.5);
            const far = mapNodes.every(n => { const dx = px - (n.x || 0), dy = py - (n.y || 0); return Math.sqrt(dx * dx + dy * dy) > buffer; });
            if (far) { newX = px; newY = py; ok = true; }
            tries++;
        }
        newTrafoNode.x = newX || (viewBox.x + viewBox.width / 2);
        newTrafoNode.y = newY || (viewBox.y + viewBox.height / 2);
        showAlert(ok ? 'Yeni TRAFO haritaya eklendi. Konumunu değiştirmek için sürükleyebilirsiniz.' : 'Uygun konum bulunamadı, TRAFO merkeze eklendi.', ok ? 'success' : 'info');
        setMapNodes(prev => [...prev, newTrafoNode]);
        setIsTrafoModalOpen(false);
    }, [mapNodes, showAlert, viewBox, productTypesList]);

    const handleSaveChanges = useCallback(() => {
        const updatedTransmissions: TransmissionRow[] = mapEdges.map(edge => {
            const from = mapNodes.find(n => n.id === edge.fromNodeId);
            const to = mapNodes.find(n => n.id === edge.toNodeId);
            const original = transmissions.find(t => String(t.id) === String(edge.id));
            const fromId = from?.id || original?.fromProductTypeId || '';
            const toId = to?.id || original?.toProductTypeId || '';
            const fromX = from?.x ? parseFloat(from.x.toFixed(2)) : original?.fromProductTypeX;
            const fromY = from?.y ? parseFloat(from.y.toFixed(2)) : original?.fromProductTypeY;
            const toX = to?.x ? parseFloat(to.x.toFixed(2)) : original?.toProductTypeX;
            const toY = to?.y ? parseFloat(to.y.toFixed(2)) : original?.toProductTypeY;
            const items = (original?.items || edge.items || []) as any;
            const formula = original?.formulaTitle || edge.formulaTitle || '';
            const miktar = original?.miktarTipi || edge.miktarTipi;
            return {
                id: original ? original.id : edge.id,
                fromProductType: from?.name || original?.fromProductType || '',
                toProductType: to?.name || original?.toProductType || '',
                distance: edge.distance,
                miktarTipi: miktar,
                network: original?.network || networkTitle,
                formulaTitle: formula,
                networkId: original?.networkId || networkId,
                fromProductTypeId: String(fromId),
                toProductTypeId: String(toId),
                fromProductTypeX: fromX,
                fromProductTypeY: fromY,
                toProductTypeX: toX,
                toProductTypeY: toY,
                items,
            } as TransmissionRow;
        });
        // const payload = updatedTransmissions.map(t => ({ ...t, 
        //     distance: Math.round((Number(t.distance) || 0)), }));
        const payload = updatedTransmissions.map(t => ({
            ...t,
            distance: parseFloat(Number(t.distance || 0).toFixed(2)),
        }));
        onSaveMapChanges(payload);
        showAlert('Harita değişiklikleri hazırlandı (güncelleme).', 'success');
        onClose();
    }, [mapEdges, mapNodes, transmissions, networkId, networkTitle, onSaveMapChanges, showAlert]);

    const handleDownload = useCallback((format: 'png' | 'pdf') => {
        if (svgContainerRef.current) {
            toPng(svgContainerRef.current, { backgroundColor: '#fff' })
                .then((dataUrl) => {
                    if (format === 'png') {
                        const link = document.createElement('a');
                        link.download = `${networkTitle}_map.png`;
                        link.href = dataUrl;
                        link.click();
                    } else {
                        const pdf = new jsPDF('l', 'mm', 'a4');
                        const imgWidth = 280;
                        const imgHeight = (pdf.internal.pageSize.getHeight() * imgWidth) / pdf.internal.pageSize.getWidth();
                        pdf.addImage(dataUrl, 'PNG', 5, 5, imgWidth, imgHeight);
                        pdf.save(`${networkTitle}_map.pdf`);
                    }
                })
                .catch((err) => console.error('Export failed', err));
        }
    }, [networkTitle]);

    if (!open) return null;

    const { x: rotateOriginX, y: rotateOriginY } = getCenterOfViewBox();

    const renderHubNode = () => {
        const hubs = mapNodes.filter(n => n.isHub);
        return (
            <>
                {hubs.map(h => {
                    const symbol = getMaterialSymbol(h.productTypeCategory);
                    const r = 25 / scale;
                    return (
                        <g key={h.id} onClick={(e) => handleNodeClick(h, e as any)} style={{ cursor: activeTool === 'viewItems' ? 'help' : 'pointer' }}>
                            <circle id={h.id} cx={h.x || 0} cy={h.y || 0} r={r} fill="transparent" stroke="transparent" strokeWidth={1 / scale} />
                            <path d={`M ${h.x || 0} ${(h.y || 0) - 20 / scale} L ${(h.x || 0) - 20 / scale} ${(h.y || 0) + 20 / scale} L ${(h.x || 0) + 20 / scale} ${(h.y || 0) + 20 / scale} Z`} fill={theme.palette.primary.main} stroke={selectedNodeIds.has(h.id) ? theme.palette.primary.dark : theme.palette.text.primary} strokeWidth={selectedNodeIds.has(h.id) ? 3 / scale : 1 / scale} style={{ pointerEvents: 'none' }} />
                            <text x={h.x || 0} y={(h.y || 0) + (8 / scale)} fontSize={`${10 / scale}px`} fill="white" textAnchor="middle" dominantBaseline="middle" style={{ pointerEvents: 'none' }}>{h.name}</text>
                            {symbol && (<text x={(h.x || 0) + (30 / scale)} y={(h.y || 0) + (5 / scale)}
                                fontSize={`${12 / scale}px`} fill={textColor} textAnchor="start" style={{ pointerEvents: 'none' }}>{symbol}</text>)}
                        </g>
                    );
                })}
            </>
        );
    };


    // --- توابع کمکی هدر و فوتر PDF ---
    const addPdfHeader = (doc: jsPDF, title: string) => {
        const pageWidth = doc.internal.pageSize.getWidth();
        const docAny = doc as any;
        // اضافه کردن لوگو
        try {
            docAny.addImage(Logo, 'PNG', pageWidth - 50, 20, 30, 15); // کمی ابعاد را تنظیم کردم
        } catch (e) {
            console.error("Logo yüklenemedi", e);
        }

        doc.setFont('NotoSans', 'normal');
        doc.setFontSize(14);
        doc.text(title, pageWidth / 2, 30, { align: 'center' }); // وسط چین

        doc.setFontSize(10);
        doc.setFont('NotoSans', 'bold');
        doc.text(`Rapor Tarihi:`, 15, 45);
        doc.setFont('NotoSans', 'normal');
        doc.text(`${formatDateDisplay(new Date().toISOString())}`, 40, 45);

        // خط جداکننده زیر هدر
        doc.setLineWidth(0.5);
        doc.line(15, 48, pageWidth - 15, 48);
    };

    const addPdfFooter = (doc: jsPDF) => {
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        const docAny = doc as any;

        doc.setFontSize(8);
        doc.setFont('NotoSans', 'normal');
        doc.setTextColor(100);

        const companyInfo = [
            'SETAŞ SİSTEM BİLİŞİM İNŞAAT TAAHHÜT TİCARET LTD. ŞTİ.',
            'Mansuroğlu Mh. 283/6 Sk. No: 2 Bayraklı - İZMİR | Tel: +90 (232) 347 74 74',
            'http://www.setasbilisim.com.tr | e-mail:setas@setasbilisim.com.tr'
        ];

        let footerY = pageHeight - 25;
        companyInfo.forEach(line => {
            doc.text(line, pageWidth / 2, footerY, { align: 'center' });
            footerY += 4;
        });

        // خط امضا و شماره صفحه
        doc.setTextColor(0);
        doc.setFontSize(10);
        doc.text('İmza', pageWidth - 20, pageHeight - 15, { align: 'right' });
        doc.line(pageWidth - 60, pageHeight - 10, pageWidth - 10, pageHeight - 10); // خط امضا

        const pageNumber = docAny.internal.getCurrentPageInfo().pageNumber;
        doc.text(`Sayfa ${pageNumber}`, 15, pageHeight - 10);
    };

    // --- تابع دانلود PDF (اصلاح شده) ---
    const handleDownloadItemsPDF = () => {
        const doc = new jsPDF();

        // لود فونت فارسی/ترکی
        doc.addFileToVFS('NotoSans-Regular.ttf', NotoSansRegular);
        doc.addFont('NotoSans-Regular.ttf', 'NotoSans', 'normal');
        doc.setFont('NotoSans');

        const tableColumn = ["Malzeme Adı", "Miktar", "Birim", "Ağırlık (Kg)"];
        const tableRows: any[] = [];

        viewItemsData.forEach(item => {
            const itemData = [
                item.name,
                Number(item.quantity).toLocaleString(),
                item.unit,
                Number(item.weight || 0).toLocaleString()
            ];
            tableRows.push(itemData);
        });

        // جدول اصلی
        autoTable(doc, {
            head: [tableColumn],
            body: tableRows,
            startY: 55, // فاصله از بالا برای هدر
            styles: {
                font: 'NotoSans',
                fontStyle: 'normal',
                fontSize: 10,
                cellPadding: 2,
                overflow: 'linebreak'
            },
            headStyles: { fillColor: [66, 66, 66] },
            margin: { top: 55, bottom: 35 }, // مارجین برای هدر و فوتر
            didDrawPage: (_data) => {
                // این تابع در هر صفحه اجرا می‌شود
                addPdfHeader(doc, viewItemsTitle);
                addPdfFooter(doc);
            }
        });

        // محاسبه موقعیت برای جدول خلاصه
        let finalY = (doc as any).lastAutoTable.finalY + 10;

        // اگر فضای کافی در صفحه نبود، صفحه جدید اضافه کن
        if (finalY > doc.internal.pageSize.getHeight() - 50) {
            doc.addPage();
            addPdfHeader(doc, viewItemsTitle); // هدر در صفحه جدید
            addPdfFooter(doc); // فوتر در صفحه جدید
            finalY = 55;
        }

        doc.setFontSize(12);
        doc.setFont('NotoSans', 'bold');
        doc.text("ÖZET TABLOSU", 15, finalY);

        const summaryRows = Object.entries(calculatedTotals.finalRows).map(([unit, data]) => [
            unit,
            data.totalQuantity.toLocaleString(),
            data.totalUnitWeights.toLocaleString(),
            data.rowTotal.toLocaleString()
        ]);

        // جدول خلاصه
        autoTable(doc, {
            head: [['Birim', 'Top. Miktar', 'Top. Birim Ağ.', 'Sonuç (Kg)']],
            body: summaryRows,
            startY: finalY + 5,
            styles: {
                font: 'NotoSans',
                fontStyle: 'normal',
                fontSize: 10,
                cellPadding: 2,
                overflow: 'linebreak'
            },
            headStyles: { fillColor: [25, 118, 210] }, // آبی
            theme: 'grid',
            margin: { bottom: 35 },
            didDrawPage: (data) => {
                // فقط اگر جدول خلاصه باعث ایجاد صفحه جدید شد
                if (data.pageNumber > 1 && data.cursor?.y === data.settings.startY) {
                    addPdfHeader(doc, viewItemsTitle);
                    addPdfFooter(doc);
                }
            }
        });

        // نمایش جمع کل
        finalY = (doc as any).lastAutoTable.finalY + 15;
        doc.setFontSize(12);
        doc.setTextColor(0, 100, 0); // سبز تیره
        doc.text(`GENEL TOPLAM: ${calculatedTotals.grandTotalWeight.toLocaleString()}`, 15, finalY);

        doc.save(`${viewItemsTitle.replace(/\s+/g, '_')}.pdf`);
    };

    // --- تابع دانلود اکسل (اصلاح شده با هدر/فوتر) ---
    const handleDownloadItemsExcel = async () => {
        const workbook = new Excel.Workbook();
        const worksheet = workbook.addWorksheet('Malzemeler');

        // --- هدر شرکت (شبیه سازی هدر PDF) ---
        worksheet.mergeCells('A1:D1');
        const titleCell = worksheet.getCell('A1');
        titleCell.value = 'SETAŞ SİSTEM BİLİŞİM İNŞAAT TAAHHÜT TİCARET LTD. ŞTİ.';
        titleCell.alignment = { horizontal: 'center' };
        titleCell.font = { bold: true, size: 12 };

        worksheet.mergeCells('A2:D2');
        const subTitleCell = worksheet.getCell('A2');
        subTitleCell.value = viewItemsTitle;
        subTitleCell.alignment = { horizontal: 'center' };
        subTitleCell.font = { bold: true, size: 14, color: { argb: 'FF1976D2' } };

        worksheet.mergeCells('A3:D3');
        const dateCell = worksheet.getCell('A3');
        dateCell.value = `Rapor Tarihi: ${formatDateDisplay(new Date().toISOString())}`;
        dateCell.alignment = { horizontal: 'center' };

        worksheet.addRow([]); // فاصله

        // --- جدول داده‌ها ---
        worksheet.columns = [
            { header: 'Malzeme Adı', key: 'name', width: 35 },
            { header: 'Miktar', key: 'quantity', width: 15 },
            { header: 'Birim', key: 'unit', width: 15 },
            { header: 'Ağırlık (Birim)', key: 'weight', width: 20 },
        ];

        // استایل هدر جدول
        const headerRow = worksheet.getRow(5);
        headerRow.values = ['Malzeme Adı', 'Miktar', 'Birim', 'Ağırlık (Birim)'];
        headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        headerRow.eachCell((cell) => {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF424242' } };
        });

        // داده‌ها
        viewItemsData.forEach(item => {
            worksheet.addRow({
                name: item.name,
                quantity: Number(item.quantity),
                unit: item.unit,
                weight: Number(item.weight || 0)
            });
        });

        worksheet.addRow([]);

        // --- جدول خلاصه ---
        const summaryTitleRow = worksheet.addRow(['ÖZET TABLOSU']);
        summaryTitleRow.font = { bold: true, size: 12 };

        const summaryHeaderRow = worksheet.addRow(['Birim', 'Top. Miktar', 'Top. Birim Ağ.', 'Sonuç']);
        summaryHeaderRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        summaryHeaderRow.eachCell((cell) => {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1976D2' } };
        });

        Object.entries(calculatedTotals.finalRows).forEach(([unit, data]) => {
            worksheet.addRow([
                unit,
                data.totalQuantity,
                data.totalUnitWeights,
                data.rowTotal
            ]);
        });

        worksheet.addRow([]);
        const grandTotalRow = worksheet.addRow(['GENEL TOPLAM', '', '', calculatedTotals.grandTotalWeight]);
        grandTotalRow.font = { bold: true, size: 12, color: { argb: 'FF006400' } }; // سبز

        // --- فوتر شرکت ---
        worksheet.addRow([]);
        const lastRowIdx = worksheet.rowCount + 1;
        worksheet.mergeCells(`A${lastRowIdx}:D${lastRowIdx}`);
        const footerCell = worksheet.getCell(`A${lastRowIdx}`);
        footerCell.value = 'http://www.setasbilisim.com.tr | e-mail:setas@setasbilisim.com.tr';
        footerCell.alignment = { horizontal: 'center' };
        footerCell.font = { size: 9, italic: true, color: { argb: 'FF808080' } };

        const buffer = await workbook.xlsx.writeBuffer();
        saveAs(new Blob([buffer]), `${viewItemsTitle.replace(/\s+/g, '_')}_Raporu.xlsx`);
    };

    return (
        <Dialog open={open} onClose={onClose} fullScreen keepMounted>
            <DialogTitle>
                <Stack direction="row" alignItems="center" justifyContent="space-between">
                    <Typography variant="h5">
                        <span style={{ color: theme.palette.primary.main }}>{networkTitle}</span>
                        Ağının İletim Haritası</Typography>
                    <IconButton onClick={onClose}><IconX /></IconButton>
                </Stack>
            </DialogTitle>

            <DialogContent dividers sx={{ p: 0, overflow: 'hidden', position: 'relative' }}>
                {transmissions.length === 0 && mapNodes.length === 0 ? (
                    <Box display="flex" justifyContent="center" alignItems="center" sx={{ height: 600 }}>
                        <Typography color="textSecondary">Bu ağ için henüz iletim kaydı bulunamadı. Yeni düğümler ekleyerek başlayabilirsiniz.</Typography>
                    </Box>
                ) : (
                    <Box sx={{ display: 'flex', height: 700 }}>
                        <Box sx={{
                            width: { xs: isLeftDrawerOpen ? '60px' : '0px', md: '60px' },
                            position: { xs: 'fixed', md: 'relative' },
                            left: { xs: '-5px', md: 0 },
                            top: { xs: '20%', md: 0 }, // در موبایل کمی پایین‌تر بیاید
                            zIndex: 1200,
                            height: { xs: 'auto', md: '100%' },
                            bgcolor: 'background.paper',
                            transition: 'all 0.3s ease',
                            display: 'flex',
                            flexDirection: 'column',
                            borderRight: '1px solid #eee',
                            boxShadow: { xs: 3, md: 0 },
                            borderRadius: { xs: '0 8px 8px 0', md: 0 }
                        }}>
                            {/* دکمه کشویی لبه کادر */}
                            <IconButton
                                onClick={() => setIsLeftDrawerOpen(!isLeftDrawerOpen)}
                                sx={{
                                    display: { xs: 'flex', md: 'none' },
                                    position: 'absolute',
                                    right: '-30px', // آیکون بیرون از کادر قرار می‌گیرد
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    zIndex: "5",
                                    bgcolor: 'primary.main',
                                    color: 'white',
                                    width: '30px',
                                    height: '40px',
                                    borderRadius: '0 8px 8px 0',
                                    '&:hover': { bgcolor: 'primary.dark' }
                                }}
                            >
                                {isLeftDrawerOpen ? <IconMinus size={18} /> : <IconPlus size={18} />}
                            </IconButton>

                            {/* محتوای ابزارها فقط وقتی باز است یا در دسکتاپ نمایش داده شود */}
                            {(isLeftDrawerOpen || theme.breakpoints.up('md')) && (
                                <ToggleButtonGroup orientation="vertical" value={activeTool} exclusive onChange={(_e, newTool) => {
                                    if (newTool !== null) {
                                        setActiveTool(newTool);
                                        setDrawingEdgeStartNode(null); setEditingNodeId(null); setEditingEdgeId(null); setEditValue(''); setIsRotating(false); setSelectedNodeIds(new Set()); setSelectedEdgeIds(new Set());
                                    }
                                }}>
                                    {/* <Tooltip placement="right" 
                                title="Seç (Sürükle/Seç)"> */}

                                    <StyledToolButton value="select" aria-label="select">

                                        <CustomTooltip placement="left" title={isTooltipGloballyEnabled ? "Bu Şantiyenin Depo indir" : ""}>
                                            <IconSelect size={20} />

                                        </CustomTooltip>
                                    </StyledToolButton>

                                    {/* </Tooltip> */}
                                    <StyledToolButton value="pan" aria-label="pan">
                                        <Tooltip placement="right" title="Kaydır">
                                            <IconHandGrab size={20} />
                                        </Tooltip>
                                    </StyledToolButton>
                                    <StyledToolButton value="viewItems" aria-label="view items">
                                        <Tooltip placement="right" title="Malzemeleri Görüntüle">
                                            <IconEye size={20} />
                                        </Tooltip>
                                    </StyledToolButton>
                                    <StyledToolButton value="edit" aria-label="edit">
                                        <Tooltip placement="right" title="Düzenle">
                                            <IconPencil size={20} />
                                        </Tooltip>
                                    </StyledToolButton>
                                    <StyledToolButton value="addNode" aria-label="add node">
                                        <Tooltip placement="right" title="Düğüm Ekle">
                                            <IconPlus size={20} />
                                        </Tooltip>
                                    </StyledToolButton>
                                    <StyledToolButton value="addEdge" aria-label="add edge">
                                        <Tooltip placement="right" title="Bağlantı Ekle">
                                            <IconLine size={20} />
                                        </Tooltip>
                                    </StyledToolButton>
                                    <StyledToolButton value="addTrafo" aria-label="add trafo">
                                        <Tooltip placement="right" title="TRAFO Ekle">
                                            <IconMapPin size={20} />
                                        </Tooltip>
                                    </StyledToolButton>
                                    <StyledToolButton value="delete" aria-label="delete">
                                        <Tooltip placement="right" title="Sil">
                                            <IconTrash size={20} />
                                        </Tooltip>
                                    </StyledToolButton>
                                    <StyledToolButton value="rotate-drag" aria-label="rotate">
                                        <Tooltip placement="right" title="Haritayı Çevir">
                                            <IconRotate2 size={20} />
                                        </Tooltip>
                                    </StyledToolButton>
                                </ToggleButtonGroup>
                            )}

                            <Tooltip placement="right" title={isDistanceLocked ? "Mesafe Kilidini Aç" : "Mesafeyi Kilitle"}>
                                <Button variant={isDistanceLocked ? "contained" : "outlined"}
                                    color={isDistanceLocked ? "error" : "primary"}
                                    onClick={() => setIsDistanceLocked(!isDistanceLocked)}
                                    sx={{ mt: 1, minWidth: 0, p: '8px', borderRadius: 0 }}>
                                    {isDistanceLocked ? <IconLock size={20} /> : <IconLockOpen size={20} />}
                                </Button>
                            </Tooltip>
                            <Tooltip placement="right" title="Yakınlaştır"><Button variant="outlined" onClick={() => handleZoom(1.2)} sx={{ mt: 1, minWidth: 0, p: '8px', borderRadius: 0 }}><IconPlus size={20} /></Button></Tooltip>
                            <Tooltip placement="right" title="Uzaklaştır"><Button variant="outlined" onClick={() => handleZoom(1 / 1.2)} sx={{ minWidth: 0, p: '8px', borderRadius: 0 }}><IconMinus size={20} /></Button></Tooltip>
                        </Box>

                        <Box ref={svgContainerRef} sx={{
                            flexGrow: 1, border: '1px solid #ccc', overflow: 'hidden',
                            cursor: isPanning ? 'grabbing' : (activeTool === 'addNode' || activeTool === 'addTrafo') ? 'crosshair' : (activeTool === 'viewItems') ? 'help' : (activeTool === 'select') ? (isDraggingNode ? 'grabbing' : 'default') : (activeTool === 'rotate-drag') ? 'grab' : (activeTool === 'edit') ? 'text' : (activeTool === 'delete') ? 'not-allowed' : (activeTool === 'addEdge') ? 'crosshair' : 'auto',
                            position: 'relative', borderRadius: 0
                        }} onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp} onWheel={handleWheel}>
                            <svg ref={svgElementRef} width="100%" height="100%" viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`} preserveAspectRatio="xMidYMid meet" style={{ display: 'block' }}>
                                <defs>{Object.keys(linkColors).map(key => (<marker key={key} id={`arrowhead-${key.toLowerCase().replace(/ /g, '-')}`} markerWidth="10" markerHeight="7" refX="12" refY="3.5" orient="auto"><polygon points="0 0, 10 3.5, 0 7" fill={linkColors[key as keyof typeof linkColors]} /></marker>))}</defs>
                                <g ref={svgGroupRef} transform={`rotate(${rotationAngle} ${rotateOriginX} ${rotateOriginY})`}>
                                    {mapEdges.map(edge => (
                                        <g key={edge.id}>
                                            <line id={edge.id} x1={edge.fromX} y1={edge.fromY} x2={edge.toX} y2={edge.toY} stroke={linkColors[edge.miktarTipi as keyof typeof linkColors] || 'gray'} strokeWidth={selectedEdgeIds.has(edge.id) ? 4 / scale : 2 / scale} markerEnd={edge.miktarTipi !== 'TR-Connection' ? `url(#arrowhead-${edge.miktarTipi.toLowerCase().replace(/ /g, '-')})` : undefined} style={{ cursor: ['select', 'edit', 'delete', 'viewItems'].includes(activeTool) ? 'pointer' : 'auto' }} onClick={(e) => handleEdgeClick(edge, e as any)} />
                                            {editingEdgeId === edge.id ? (
                                                <foreignObject x={(edge.fromX + edge.toX) / 2 - 30 / scale} y={(edge.fromY + edge.toY) / 2 - 15 / scale} width={60 / scale} height={25 / scale}>
                                                    <input ref={inputRef} type="text" value={editValue} onChange={handleEdgeDistanceChange} onBlur={handleEdgeDistanceBlur} onKeyDown={handleEdgeDistanceKeyDown} onMouseDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()} autoFocus style={{ width: '100%', height: '100%', boxSizing: 'border-box', textAlign: 'center', fontSize: `${10 / scale}px`, background: theme.palette.background.paper, color: textColor, border: `1px solid ${theme.palette.primary.main}`, borderRadius: 0, padding: '2px' }} />
                                                </foreignObject>
                                            ) : (
                                                <text x={(edge.fromX + edge.toX) / 2} y={(edge.fromY + edge.toY) / 2 - (5 / scale)} fontSize={`${10 / scale}px`} fill={textColor} textAnchor="middle" style={{ textShadow: `1px 1px 2px ${theme.palette.background.default}`, pointerEvents: activeTool === 'edit' ? 'auto' : 'none', cursor: activeTool === 'edit' ? 'text' : 'auto' }} onClick={(e) => handleTextClick(edge.id, 'edge', String(edge.distance), e as any)}>{`${edge.distance}m`}</text>
                                            )}
                                        </g>
                                    ))}
                                    {renderHubNode()}
                                    {/* {mapNodes.filter(n => !n.isHub).map(node => {
                                        const status = getNodeStatus(node.id);
                                        const symbol = getMaterialSymbol(node.productTypeCategory);
                                        const baseStroke = theme.palette.primary.main;
                                        const r = selectedNodeIds.has(node.id) ? 10 / scale : 8 / scale;
                                        return (
                                            <g key={node.id}>
                                                <circle id={node.id} cx={node.x || 0} cy={node.y || 0} r={r} fill={status === 0 ? baseStroke : 'transparent'} stroke={baseStroke} strokeWidth={selectedNodeIds.has(node.id) ? 3 / scale : 2 / scale} className={node.isNew ? 'blink-node' : ''} style={{ cursor: ['select', 'edit', 'delete', 'addEdge', 'viewItems'].includes(activeTool) ? 'pointer' : 'auto' }} onClick={(e) => handleNodeClick(node, e as any)} />
                                                {status === 1 && (<circle cx={node.x || 0} cy={node.y || 0} r={4 / scale} fill={baseStroke} style={{ pointerEvents: 'none' }} />)}


                                                {symbol && (
                                                    <text
                                                        x={node.x || 0}
                                                        y={(node.y || 0) + (4 / scale)} // انتقال به مرکز دایره
                                                        fontSize={`${10 / scale}px`}
                                                        textAnchor="middle"
                                                        dominantBaseline="middle" // تراز عمودی دقیق
                                                        style={{
                                                            pointerEvents: 'none',
                                                            userSelect: 'none',
                                                            zIndex: 10 // اطمینان از قرارگیری روی دایره
                                                        }}
                                                    >
                                                        {symbol}
                                                    </text>
                                                )}

                                                <text x={node.x || 0} y={(node.y || 0) - (15 / scale)} fontSize={`${10 / scale}px`} fill={textColor} textAnchor="middle" style={{ textShadow: `1px 1px 2px ${theme.palette.background.default}`, pointerEvents: 'auto', cursor: activeTool === 'edit' ? 'text' : 'auto' }} onClick={(e) => handleTextClick(node.id, 'node', node.name, e as any)}><tspan>{node.name}</tspan>{symbol && (<tspan dx={4 / scale}>{symbol}</tspan>)}</text>
                                            </g>
                                        );
                                    })} */}

                                    {mapNodes.filter(n => !n.isHub).map(node => {
                                        const status = getNodeStatus(node.id);
                                        const symbol = getMaterialSymbol(node.productTypeCategory);
                                        const baseStroke = theme.palette.primary.main;
                                        const r = selectedNodeIds.has(node.id) ? 10 / scale : 8 / scale;

                                        return (
                                            <g key={node.id}>
                                                {/* ۱. لایه زیرین: دایره اصلی نود */}
                                                <circle
                                                    id={node.id}
                                                    cx={node.x || 0}
                                                    cy={node.y || 0}
                                                    r={r}
                                                    fill={status === 0 ? baseStroke : 'white'} // اگر DMM بود داخلش سفید باشد
                                                    stroke={baseStroke}
                                                    strokeWidth={selectedNodeIds.has(node.id) ? 3 / scale : 2 / scale}
                                                    className={node.isNew ? 'blink-node' : ''}
                                                    style={{ cursor: 'pointer' }}
                                                    onClick={(e) => handleNodeClick(node, e as any)}
                                                />

                                                {/* ۲. لایه میانی: نقطه داخلی برای وضعیت DMM (اگر نیاز است) */}
                                                {status === 1 && (
                                                    <circle
                                                        cx={node.x || 0}
                                                        cy={node.y || 0}
                                                        r={3 / scale}
                                                        fill={baseStroke}
                                                        style={{ pointerEvents: 'none' }}
                                                    />
                                                )}

                                                {/* ۳. لایه رویی: اموجی نماد (دقیقاً مرکز نود) */}
                                                {symbol && (
                                                    <text
                                                        x={node.x || 0}
                                                        y={node.y || 0}
                                                        fontSize={`${9 / scale}px`}
                                                        textAnchor="middle"
                                                        dominantBaseline="central" // مرکزیت عمودی دقیق در SVG
                                                        style={{
                                                            pointerEvents: 'none',
                                                            userSelect: 'none',
                                                            fill: status === 0 ? 'white' : 'black' // تضاد رنگی با پس‌زمینه دایره
                                                        }}
                                                    >
                                                        {symbol}
                                                    </text>
                                                )}

                                                {/* ۴. متن نام نود (بالای نود) */}
                                                <text
                                                    x={node.x || 0}
                                                    y={(node.y || 0) - (r + 5 / scale)}
                                                    fontSize={`${10 / scale}px`}
                                                    fill={textColor}
                                                    textAnchor="middle"
                                                    style={{
                                                        fontWeight: 'bold',
                                                        paintOrder: 'stroke',
                                                        stroke: theme.palette.background.default,
                                                        strokeWidth: 2 / scale,
                                                        pointerEvents: 'none'
                                                    }}
                                                >
                                                    {node.name}
                                                </text>
                                            </g>
                                        );
                                    })}
                                    {drawingEdgeStartNode && activeTool === 'addEdge' && panStartMousePos && (<line x1={drawingEdgeStartNode.x || 0} y1={drawingEdgeStartNode.y || 0} x2={getSvgCoordinates(panStartMousePos.x, panStartMousePos.y).x} y2={getSvgCoordinates(panStartMousePos.x, panStartMousePos.y).y} stroke="gray" strokeWidth="1" strokeDasharray="5,5" />)}
                                </g>
                            </svg>
                        </Box>

                        <Box sx={{
                            width: { xs: isRightDrawerOpen ? '240px' : '0px', md: '260px' },
                            position: { xs: 'fixed', md: 'relative' },
                            right: '0',
                            top: { xs: '20%', md: 0 },
                            zIndex: 1200,
                            height: { xs: '80%', md: '100%' }, // در موبایل تمام صفحه نباشد
                            bgcolor: 'background.paper',
                            transition: 'all 0.3s ease',
                            borderLeft: '1px solid #eee',
                            boxShadow: { xs: 3, md: 0 },
                            borderRadius: { xs: '8px 0 0 8px', md: 0 }
                        }}>
                            <IconButton
                                onClick={() => setIsRightDrawerOpen(!isRightDrawerOpen)}
                                sx={{
                                    display: { xs: 'flex', md: 'none' },
                                    position: 'absolute',
                                    left: '-30px',
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    bgcolor: 'secondary.main',
                                    color: 'white',
                                    width: '30px',
                                    height: '40px',
                                    borderRadius: '8px 0 0 8px',
                                    '&:hover': { bgcolor: 'secondary.dark' }
                                }}
                            >
                                {isRightDrawerOpen ? <IconPlus size={18} style={{ transform: 'rotate(45deg)' }} /> : <IconMapPin size={18} />}
                            </IconButton>
                            {(isRightDrawerOpen || theme.breakpoints.up('md')) && (
                                <Box paddingLeft={2}>

                                    <Typography variant="h6" mb={2}>Harita Kılavuzu</Typography>
                                    <Stack spacing={1}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                            <Box sx={{ width: 16, height: 16, bgcolor: theme.palette.primary.main, clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)' }} />
                                            <Typography variant="body2">Merkez Düğüm (TRAFO)</Typography>
                                        </Box>
                                        <Typography variant="body1" sx={{ fontWeight: 'bold' }}>Düğüm Tipi</Typography>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                            <Box sx={{ width: 16, height: 16, borderRadius: '50%', bgcolor: theme.palette.primary.main }} />
                                            <Typography variant="body2">YENİ (Dolu)</Typography>
                                        </Box>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                            <Box sx={{ width: 16, height: 16, borderRadius: '50%', border: `2px solid ${theme.palette.primary.main}`, bgcolor: 'transparent', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                                                <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: theme.palette.primary.main }} />
                                            </Box>
                                            <Typography variant="body2">DMM (Yarı Dolu)</Typography>
                                        </Box>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                            <Box sx={{ width: 16, height: 16, borderRadius: '50%', border: `2px solid ${theme.palette.primary.main}`, bgcolor: 'transparent' }} />
                                            <Typography variant="body2">MEVCUT (Boş)</Typography>
                                        </Box>
                                        <Typography variant="body1" sx={{ fontWeight: 'bold', mt: 1 }}>Malzeme</Typography>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><Typography variant="body2" component="span">🧱</Typography><Typography variant="body2">Beton Direk</Typography></Box>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><Typography variant="body2" component="span">⚙️</Typography><Typography variant="body2">Demir Direk</Typography></Box>
                                        <Typography variant="body1" sx={{ fontWeight: 'bold', mt: 1 }}>Bağlantı Tipi</Typography>
                                        {Object.keys(linkColors).map(type => (<Box key={type} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><Box sx={{ width: 24, height: 2, bgcolor: linkColors[type as keyof typeof linkColors] }} /><Typography variant="body2">{type}</Typography></Box>))}
                                    </Stack>
                                </Box>
                            )}
                        </Box>
                    </Box>
                )}
            </DialogContent>

            <DialogActions>
                <Button onClick={onClose} color="primary" variant="outlined" sx={{ borderRadius: 0 }}>Kapat</Button>
                <Button onClick={handleSaveChanges} color="primary" variant="contained" sx={{ borderRadius: 0 }}>Değişiklikleri Kaydet</Button>
                <Button onClick={() => handleDownload('png')} color="secondary" variant="contained" sx={{ borderRadius: 0 }}>PNG İndir</Button>
                <Button onClick={() => handleDownload('pdf')} color="secondary" variant="contained" sx={{ borderRadius: 0 }}>PDF İndir</Button>
            </DialogActions>

            <style>{`@keyframes blink { 0%{opacity:1;} 50%{opacity:.5;} 100%{opacity:1;} } .blink-node { animation: blink 1s infinite; }`}</style>

            {tempTransmissionData && (<AddTransmissionDetailsModal open={openDetailsModal} onClose={() => { setOpenDetailsModal(false); setDrawingEdgeStartNode(null); }} onSave={handleSaveTransmissionDetails} fromNode={tempTransmissionData.fromNode} toNode={tempTransmissionData.toNode} itemsList={itemsList} showAlert={showAlert} />)}
            <SelectTrafoModal open={isTrafoModalOpen} onClose={() => setIsTrafoModalOpen(false)} onSelectTrafo={handleSelectNewTrafo} onRegisterNewTrafo={onRegisterNewTrafo} showAlert={showAlert} availableTrafoOptions={availableTrafoOptionsForMap} />
            <SelectProductTypeModal open={isProductTypeModalOpen} onClose={() => { setIsProductTypeModalOpen(false); setEditingNodeId(null); }} onSelectProductType={handleSelectProductType} onRegisterNewProductType={onRegisterNewTrafo} showAlert={showAlert} availableProductTypeOptions={availableProductTypeOptionsForMap} />

            {/* --- مودال نمایش آیتم‌ها و مجموع‌ها --- */}
            <Dialog
                open={viewItemsModalOpen}
                onClose={() => setViewItemsModalOpen(false)}
                maxWidth="md"
                fullWidth
            >
                <DialogTitle>
                    <Stack direction="row" alignItems="center" justifyContent="space-between">
                        <Typography variant="h6">{viewItemsTitle}</Typography>
                        <IconButton onClick={() => setViewItemsModalOpen(false)}><IconX size={20} /></IconButton>
                    </Stack>
                </DialogTitle>
                <DialogContent dividers>
                    {viewItemsLoading ? (
                        <Box display="flex" justifyContent="center" alignItems="center" p={3}>
                            <CircularProgress />
                            <Typography sx={{ ml: 2 }}>Yükleniyor...</Typography>
                        </Box>
                    ) : (
                        viewItemsData.length > 0 ? (
                            <>
                                <TableContainer component={Paper} elevation={0} variant="outlined" sx={{ mb: 3 }}>
                                    <Table size="small">
                                        <TableHead sx={{ bgcolor: theme.palette.grey[100] }}>
                                            <TableRow>
                                                <TableCell>Malzeme Adı</TableCell>
                                                <TableCell align="right">Miktar</TableCell>
                                                <TableCell align="right">Birim</TableCell>
                                                <TableCell align="right">Ağırlık (Birim)</TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {viewItemsData.map((item, index) => (
                                                <TableRow key={item.id || index} hover>
                                                    <TableCell>{item.name}</TableCell>
                                                    <TableCell align="right">{item.quantity}</TableCell>
                                                    <TableCell align="right">{item.unit}</TableCell>
                                                    <TableCell align="right">{item.weight || '-'}</TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </TableContainer>

                                <Divider sx={{ my: 2 }}>
                                    <Typography variant="body2" color="textSecondary" sx={{ fontWeight: 'bold' }}>
                                        ÖZET TABLOSU
                                    </Typography>
                                </Divider>

                                <Grid container spacing={2}>
                                    {/* جدول ۴ ستونی */}
                                    <Grid item xs={12} md={9}>
                                        <Paper variant="outlined" sx={{ overflow: 'hidden', bgcolor: theme.palette.background.paper }}>
                                            <Table size="small">
                                                <TableHead sx={{ bgcolor: theme.palette.primary.dark }}>
                                                    <TableRow>
                                                        <TableCell sx={{ color: '#fff', fontWeight: 'bold' }}>Birim (Unit)</TableCell>
                                                        <TableCell align="right" sx={{ color: '#fff', fontWeight: 'bold' }}>Top. Miktar</TableCell>
                                                        <TableCell align="right" sx={{ color: '#fff', fontWeight: 'bold' }}>Top. Birim Ağ.</TableCell>
                                                        <TableCell align="right" sx={{ color: '#fff', fontWeight: 'bold' }}>Sonuç (Kg)</TableCell>
                                                    </TableRow>
                                                </TableHead>
                                                <TableBody>
                                                    {Object.entries(calculatedTotals.finalRows).map(([unit, data]) => (
                                                        <TableRow key={unit} hover>
                                                            {/* ستون ۱: واحد */}
                                                            <TableCell component="th" scope="row" sx={{ fontWeight: 'bold' }}>
                                                                {unit}
                                                            </TableCell>

                                                            {/* ستون ۲: جمع کل مقدار */}
                                                            <TableCell align="right">
                                                                {data.totalQuantity.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                            </TableCell>

                                                            {/* ستون ۳: جمع کل وزن‌های واحد */}
                                                            <TableCell align="right" sx={{ color: '#666' }}>
                                                                {data.totalUnitWeights.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                            </TableCell>

                                                            {/* ستون ۴: حاصل‌ضرب ستون ۲ در ۳ */}
                                                            <TableCell align="right" sx={{ color: theme.palette.info.main, fontWeight: 'bold', bgcolor: 'rgba(0,0,0,0.02)' }}>
                                                                {data.rowTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                            </TableCell>
                                                        </TableRow>
                                                    ))}
                                                </TableBody>
                                            </Table>
                                        </Paper>
                                    </Grid>

                                    {/* کادر جمع کل نهایی */}
                                    <Grid item xs={12} md={3}>
                                        <Paper
                                            elevation={4}
                                            sx={{
                                                p: 2,
                                                height: '100%',
                                                bgcolor: theme.palette.success.dark,
                                                color: '#fff',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                justifyContent: 'center',
                                                alignItems: 'center',
                                                borderRadius: 2
                                            }}
                                        >
                                            <Typography variant="subtitle2" sx={{ opacity: 0.9, mb: 1, textAlign: 'center' }}>
                                                GENEL TOPLAM
                                            </Typography>
                                            <Divider sx={{ width: '80%', borderColor: 'rgba(255,255,255,0.3)', mb: 2 }} />

                                            <Typography variant="h4" fontWeight="bold">
                                                {calculatedTotals.grandTotalWeight.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                                            </Typography>
                                        </Paper>
                                    </Grid>
                                </Grid>
                            </>
                        ) : (
                            <Typography color="textSecondary" align="center" p={2}>
                                Görüntülenecek malzeme yok.
                            </Typography>
                        )
                    )}
                </DialogContent>

                <DialogActions sx={{ justifyContent: 'space-between', px: 3, pb: 2 }}>
                    <Stack direction="row" spacing={1}>
                        <Button
                            variant="contained"
                            color="success"
                            startIcon={<IconFileDownload size={18} />}
                            onClick={handleDownloadItemsExcel}
                            disabled={viewItemsData.length === 0}
                        >
                            Excel
                        </Button>
                        <Button
                            variant="contained"
                            color="error"
                            startIcon={<IconFileDownload size={18} />}
                            onClick={handleDownloadItemsPDF}
                            disabled={viewItemsData.length === 0}
                        >
                            PDF
                        </Button>
                    </Stack>
                    <Button onClick={() => setViewItemsModalOpen(false)} variant="outlined" color="secondary">
                        Kapat
                    </Button>
                </DialogActions>
            </Dialog>

        </Dialog>

    );
};

export default MapPreviewModal;