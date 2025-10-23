import React, { useCallback, useState, useEffect, useRef } from 'react';

import {
    Dialog, DialogTitle, DialogContent, DialogActions,
    Button, Typography, Box, Stack, IconButton,
    ToggleButtonGroup, ToggleButton as MuiToggleButton, Tooltip
} from '@mui/material';
import { useTheme, styled, Theme } from '@mui/material/styles';
import {
    IconX, IconSelect, IconHandGrab, IconPlus, IconMinus, IconTrash,
    IconLine, IconRotate2, IconPencil, IconMapPin,
} from '@tabler/icons-react';
import * as d3 from 'd3-force';
import { toPng } from 'html-to-image';
import jsPDF from 'jspdf';
import AddTransmissionDetailsModal from './AddTransmissionDetailsModal';
import SelectTrafoModal from './SelectTrafoModal';
import SelectProductTypeModal from './SelectProductTypeModal';
import { MapNode, TransmissionRow, SelectOption, AddedItem, ItemType, MiktarTipi, D3MapLink, MapEdge, ProductTypesType } from './types';

type ToolType = 'select' | 'pan' | 'addNode' | 'addEdge' | 'delete' | 'zoomIn' | 'zoomOut' | 'rotate-drag' | 'edit' | 'addTrafo';

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

// لبه‌ها همچنان با رنگ قبلی (برای نوع اتصال) ـ اگر خواستی عوض کن
const linkColors = {
    'Yeni YG': '#4CAF50',
    'Yeni AG': '#FFC107',
    'DMM YG': '#2196F3',
    'DMM AG': '#E91E63',
    'TR-Connection': '#9E9E9E',
};

// وضعیت سه‌حالته‌ی گره: 0=YENİ (پر)، 1=DMM (نیمه‌پر)، 2=MEVCUT (خالی)
type NodeStatus = 0 | 1 | 2;

interface MapPreviewModalProps {
    open: boolean;
    onClose: () => void;
    transmissions: TransmissionRow[];
    networkId: string | undefined;
    networkTitle: string;
    onUpdateTransmissions: (newTransmissions: TransmissionRow[]) => void;
    onSaveMapChanges: (updatedTransmissions: TransmissionRow[]) => void; // والد فقط update می‌زند
    allProductTypes: SelectOption[];
    itemsList: ItemType[];
    showAlert: (message: string, severity: 'success' | 'error' | 'warning' | 'info') => void;
    onRegisterNewTrafo: (name: string, type: number) => Promise<void>;
    productTypesList: ProductTypesType[];
    availableTrafoOptionsForMap: SelectOption[];
    availableProductTypeOptionsForMap: SelectOption[];
    // 👇 جدید: وضعیت گره‌ها از channelRows (id: productStatus)
    nodeStatusByChannelRowId?: Record<string, NodeStatus>;
}

const MapPreviewModal: React.FC<MapPreviewModalProps> = ({
    open,
    onClose,
    transmissions,
    networkId,
    networkTitle,
    onSaveMapChanges,
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
    const [mapNodes, setMapNodes] = useState<MapNode[]>([]);
    const [mapEdges, setMapEdges] = useState<MapEdge[]>([]);
    const [openDetailsModal, setOpenDetailsModal] = useState(false);
    const [tempTransmissionData, setTempTransmissionData] = useState<{ fromNode: MapNode; toNode: MapNode; } | null>(null);
    const [isTrafoModalOpen, setIsTrafoModalOpen] = useState(false);
    const [isProductTypeModalOpen, setIsProductTypeModalOpen] = useState(false);

    const svgGroupRef = useRef<SVGGElement>(null);

    const MIN_NODE_GAP = 80; // فاصله‌ی مینیمم بین مراکز نودها (px)
    // const NODE_RADIUS = 20;



    // === Helper: وضعیت گره (پر/نیمه‌پر/خالی) از روی channelRows.productStatus ===
    const getNodeStatus = useCallback((nodeId: string, _fallbackMiktarTipi?: MiktarTipi): NodeStatus => {
        // اگر والد map وضعیت را پاس داده:
        if (nodeStatusByChannelRowId && nodeStatusByChannelRowId[nodeId as keyof typeof nodeStatusByChannelRowId] !== undefined) {
            return nodeStatusByChannelRowId[nodeId as keyof typeof nodeStatusByChannelRowId] as NodeStatus;
        }
        // Fallback قدیمی: از لبه‌ی ورودی نوع را حدس بزنیم
        // Yeni → 0، DMM → 1، Mevcut → 2 (در fallback فقط دو حالت داریم؛ Mevcut را 2 می‌گیریم)
        const incoming = mapEdges.find(e => e.toNodeId === nodeId && e.miktarTipi !== 'TR-Connection');
        if (incoming) {
            if (String(incoming.miktarTipi).toLowerCase().includes('dmm')) return 1;
            return 0; // yeni
        }
        // اگر هیچ چیز نبود:
        return 0;
    }, [nodeStatusByChannelRowId, mapEdges]);

    // === Helper: آیکون مصالح (بتن/آهن) ===
    const getMaterialSymbol = (ptcat?: 1 | 2) => (ptcat === 1 ? '🧱' : ptcat === 2 ? '⚙️' : '');

    // === نگاشت ترنسفر به نود/لبه ===
    const convertTransmissionsToMapData = useCallback((currentTransmissions: TransmissionRow[]) => {
        const nodesMap = new Map<string, MapNode>();
        const links: D3MapLink[] = [];
        const productTypeDetailsMap = new Map(productTypesList.map(p => [String(p.id), p]));

        // تشخیص HUB: مبداهایی که مقصد کسی نیستند
        const allFrom = new Set(currentTransmissions.map(t => t.fromProductType));
        const allTo = new Set(currentTransmissions.map(t => t.toProductType));
        const possibleHubs = Array.from(allFrom).filter(nm => !allTo.has(nm));
        let hubNodeName: string | undefined = possibleHubs[0];

        currentTransmissions.forEach(t => {
            const fromId = t.fromProductTypeId || '';
            const toId = t.toProductTypeId || '';

            const fromDetails = productTypeDetailsMap.get(String(fromId));
            const toDetails = productTypeDetailsMap.get(String(toId));

            if (!nodesMap.has(t.fromProductType)) {
                nodesMap.set(t.fromProductType, {
                    id: String(fromId),
                    name: t.fromProductType,
                    x: t.fromProductTypeX,
                    y: t.fromProductTypeY,
                    fx: t.fromProductTypeX,
                    fy: t.fromProductTypeY,
                    isNew: !fromId, // اگر ID ندارد، جدید تلقی شود
                    productTypeCategory: fromDetails?.type as 1 | 2 | undefined,
                });
            }
            if (!nodesMap.has(t.toProductType)) {
                nodesMap.set(t.toProductType, {
                    id: String(toId),
                    name: t.toProductType,
                    x: t.toProductTypeX,
                    y: t.toProductTypeY,
                    fx: t.toProductTypeX,
                    fy: t.toProductTypeY,
                    isNew: !toId,
                    productTypeCategory: toDetails?.type as 1 | 2 | undefined,
                });
            }
        });

        if (hubNodeName && nodesMap.has(hubNodeName)) {
            const hub = nodesMap.get(hubNodeName)!;
            hub.isHub = true;
            if (hub.x === undefined || hub.y === undefined) {
                hub.fx = initialViewWidth / 2;
                hub.fy = initialViewHeight / 2;
            }
        }

        currentTransmissions.forEach(t => {
            const fromNode = nodesMap.get(t.fromProductType);
            const toNode = nodesMap.get(t.toProductType);
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
    }, [initialViewHeight, initialViewWidth, productTypesList]);

    // === Force layout با برخورد قوی‌تر برای جلوگیری از هم‌افتادگی ===
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
                        fromX: s.x || 0, fromY: s.y || 0,
                        toX: t.x || 0, toY: t.y || 0,
                        distance: link.distance,
                        miktarTipi: link.miktarTipi,
                        formulaTitle: link.formulaTitle,
                        items: link.items
                    };
                })
            };
        }

        const simulation = d3.forceSimulation(nodes)
            .force('link', d3.forceLink<MapNode, D3MapLink>(links).id(d => d.id).distance(180))
            .force('charge', d3.forceManyBody().strength(-1400))   // دفع قوی‌تر
            .force('collide', d3.forceCollide(MIN_NODE_GAP / 2))   // برخورد بزرگ‌تر
            .force('center', d3.forceCenter(initialViewWidth / 2, initialViewHeight / 2));

        simulation.stop();
        const iters = Math.min(300, Math.max(100, nodes.length * 20));
        for (let i = 0; i < iters; ++i) simulation.tick();

        // 👇 پس‌پردازش: اگر هنوز چسبیده‌اند، کمی هُل بده
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
        for (let k = 0; k < 5; k++) { if (!resolveOverlaps(nodes)) break; }

        const updatedNodes = nodes.map(n => ({ ...n, x: n.x ?? initialViewWidth / 2, y: n.y ?? initialViewHeight / 2 }));

        return {
            nodes: updatedNodes,
            edges: links.map(link => {
                const sId = (link.source as MapNode).id;
                const tId = (link.target as MapNode).id;
                const s = updatedNodes.find(n => n.id === sId) || (link.source as MapNode);
                const t = updatedNodes.find(n => n.id === tId) || (link.target as MapNode);
                return {
                    id: link.id,
                    fromNodeId: s.id, toNodeId: t.id,
                    fromX: s.x || 0, fromY: s.y || 0,
                    toX: t.x || 0, toY: t.y || 0,
                    distance: link.distance,
                    miktarTipi: link.miktarTipi,
                    formulaTitle: link.formulaTitle,
                    items: link.items
                };
            })
        };
    }, [initialViewHeight, initialViewWidth]);

    // ریست و بارگذاری
    useEffect(() => {
        if (!open) {
            setMapNodes([]);
            setMapEdges([]);
            setViewBox({ x: 0, y: 0, width: initialViewWidth, height: initialViewHeight });
            setScale(1);
            setRotationAngle(0);
            setActiveTool('select');
            setDrawingEdgeStartNode(null);
            setEditingNodeId(null);
            setEditingEdgeId(null);
            setEditValue('');
            setOpenDetailsModal(false);
            setTempTransmissionData(null);
            setIsTrafoModalOpen(false);
            setIsProductTypeModalOpen(false);
            return;
        }

        setActiveTool('select');

        if (transmissions.length > 0) {
            const { nodes, links } = convertTransmissionsToMapData(transmissions);
            // اگر هیچ مختصاتی نداریم یا هم‌افتادگی محسوس است، شبیه‌سازی کن
            const hasInitialCoordinates = nodes.some(n => n.x !== undefined && n.y !== undefined);

            let runSim = !hasInitialCoordinates;
            if (!runSim) {
                // بررسی حداقل فاصله
                let minDist = Infinity;
                for (let i = 0; i < nodes.length; i++) {
                    for (let j = i + 1; j < nodes.length; j++) {
                        const dx = (nodes[i].x ?? 0) - (nodes[j].x ?? 0);
                        const dy = (nodes[i].y ?? 0) - (nodes[j].y ?? 0);
                        const d = Math.sqrt(dx * dx + dy * dy);
                        if (d < minDist) minDist = d;
                    }
                }
                if (minDist < 40) runSim = true; // اگر خیلی نزدیکن، بچین
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
            setMapNodes([]);
            setMapEdges([]);
            setViewBox({ x: 0, y: 0, width: initialViewWidth, height: initialViewHeight });
        }
    }, [open, transmissions, convertTransmissionsToMapData, applyForceLayout, initialViewWidth, initialViewHeight]);

    const getCenterOfViewBox = useCallback(() => ({ x: viewBox.x + viewBox.width / 2, y: viewBox.y + viewBox.height / 2 }), [viewBox]);
    const getAngle = useCallback((p1: { x: number; y: number }, p2: { x: number; y: number }) => Math.atan2(p2.y - p1.y, p2.x - p1.x) * 180 / Math.PI, []);
    useEffect(() => { if (editingNodeId || editingEdgeId) { inputRef.current?.focus(); } }, [editingNodeId, editingEdgeId]);

    // const getSvgCoordinates = useCallback((clientX: number, clientY: number) => {
    //     if (!svgElementRef.current) return { x: 0, y: 0 };
    //     const svgPoint = svgElementRef.current.createSVGPoint();
    //     svgPoint.x = clientX; svgPoint.y = clientY;
    //     const CTM = svgElementRef.current.getScreenCTM();
    //     if (CTM) {
    //         const inverse = CTM.inverse();
    //         const pt = svgPoint.matrixTransform(inverse);
    //         return { x: pt.x, y: pt.y };
    //     }
    //     return { x: 0, y: 0 };
    // }, []);


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


    const handleSaveTransmissionDetails = useCallback((
        fromNode: MapNode,
        toNode: MapNode,
        distance: number,
        miktarTipi: MiktarTipi,
        formulaTitle: string,
        addedItems: AddedItem[]
    ) => {
        const exists = mapEdges.some(e =>
            (e.fromNodeId === fromNode.id && e.toNodeId === toNode.id) ||
            (e.fromNodeId === toNode.id && e.toNodeId === fromNode.id)
        );
        if (exists) {
            showAlert('Bu iletim zaten mevcut.', 'warning');
            return;
        }
        const newEdge: MapEdge = {
            id: `edge-${Date.now()}`,
            fromNodeId: fromNode.id,
            toNodeId: toNode.id,
            fromX: fromNode.x || 0,
            fromY: fromNode.y || 0,
            toX: toNode.x || 0,
            toY: toNode.y || 0,
            distance,
            miktarTipi,
            formulaTitle,
            items: addedItems,
        };
        setMapEdges(prev => [...prev, newEdge]);
        setOpenDetailsModal(false);
        showAlert('Yeni iletim haritaya eklendi.', 'success');
    }, [mapEdges, showAlert]);

    // انتخاب/جایگزینی گره محصول
    const handleSelectProductType = useCallback((productType: SelectOption) => {
        const productTypeInApi = productTypesList.find(p => p.id === productType.id);

        if (editingNodeId) {
            const editedNode = mapNodes.find(n => n.id === editingNodeId);
            if (!editedNode) return;

            const isDup = mapNodes.some(node => node.id !== editedNode.id && node.name.toLowerCase() === productType.name.toLowerCase());
            if (isDup) { showAlert('Bu isimde bir düğüm zaten var.', 'warning'); return; }

            const updatedNodes = mapNodes.map(node =>
                node.id === editedNode.id ? {
                    ...node,
                    id: productType.id,
                    name: productType.name,
                    isNew: !productTypeInApi || productType.id.startsWith('temp-'),
                    productTypeCategory: productTypeInApi?.type as 1 | 2 | undefined, // 👈 نوع مصالح
                } : node
            );
            const updatedEdges = mapEdges.map(edge => {
                if (edge.fromNodeId === editedNode.id) return { ...edge, fromNodeId: productType.id };
                if (edge.toNodeId === editedNode.id) return { ...edge, toNodeId: productType.id };
                return edge;
            });

            setMapNodes(updatedNodes);
            setMapEdges(updatedEdges);
        } else {
            const isAlready = mapNodes.some(node => String(node.id) === productType.id);
            if (isAlready) {
                showAlert('Bu ürün tipi zaten haritada mevcut.', 'warning');
                setIsProductTypeModalOpen(false);
                return;
            }

            const newNode: MapNode = {
                id: productType.id,
                name: productType.name,
                isHub: false,
                isNew: !productTypeInApi || productType.id.startsWith('temp-'),
                x: undefined, y: undefined, fx: undefined, fy: undefined,
                productTypeCategory: productTypeInApi?.type as 1 | 2 | undefined, // 👈 نوع مصالح
            };

            // مکان‌یابی با فاصله از بقیه
            const buffer = 180;
            let newX: number | undefined, newY: number | undefined;
            let ok = false; let tries = 0;
            while (!ok && tries < 60) {
                const px = (viewBox.x + viewBox.width / 2) + (Math.random() - 0.5) * (viewBox.width / 1.5);
                const py = (viewBox.y + viewBox.height / 2) + (Math.random() - 0.5) * (viewBox.height / 1.5);
                const far = mapNodes.every(n => {
                    const dx = px - (n.x || 0), dy = py - (n.y || 0);
                    return Math.sqrt(dx * dx + dy * dy) > buffer;
                });
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
            id: trafo.id,
            name: trafo.name,
            isHub: true,
            isNew: false,
            x: undefined, y: undefined, fx: undefined, fy: undefined,
            productTypeCategory: trafoDetails?.type as 1 | 2 | undefined, // 👈 نوع مصالح
        };

        const buffer = 200;
        let newX: number | undefined, newY: number | undefined;
        let ok = false; let tries = 0;
        while (!ok && tries < 60) {
            const px = (viewBox.x + viewBox.width / 2) + (Math.random() - 0.5) * (viewBox.width / 1.5);
            const py = (viewBox.y + viewBox.height / 2) + (Math.random() - 0.5) * (viewBox.height / 1.5);
            const far = mapNodes.every(n => {
                const dx = px - (n.x || 0), dy = py - (n.y || 0);
                return Math.sqrt(dx * dx + dy * dy) > buffer;
            });
            if (far) { newX = px; newY = py; ok = true; }
            tries++;
        }
        newTrafoNode.x = newX || (viewBox.x + viewBox.width / 2);
        newTrafoNode.y = newY || (viewBox.y + viewBox.height / 2);

        showAlert(ok ? 'Yeni TRAFO haritaya eklendi. Konumunu değiştirmek için sürükleyebilirsiniz.' : 'Uygun konum bulunamadı, TRAFO merkeze eklendi.', ok ? 'success' : 'info');
        setMapNodes(prev => [...prev, newTrafoNode]);
        setIsTrafoModalOpen(false);
    }, [mapNodes, showAlert, viewBox, productTypesList]);

    const handleNodeClick = useCallback((node: MapNode, e: React.MouseEvent<SVGCircleElement>) => {
        e.stopPropagation();
        if (activeTool === 'select') {
            setSelectedNodeIds(new Set([node.id]));
            setSelectedEdgeIds(new Set());
        } else if (activeTool === 'edit') {
            if (!node.isHub) {
                setEditingNodeId(node.id);
                setIsProductTypeModalOpen(true);
            }
        } else if (activeTool === 'delete') {
            if (!node.isHub) {
                setMapNodes(prev => prev.filter(n => n.id !== node.id));
                setMapEdges(prev => prev.filter(e => e.fromNodeId !== node.id && e.toNodeId !== node.id));
            } else {
                showAlert('TRAFO silinemez, bağlantıları silinmeli.', 'warning');
            }
            setSelectedNodeIds(new Set());
            setSelectedEdgeIds(new Set());
        }
    }, [activeTool, showAlert]);

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

    const handleEdgeClick = useCallback((edge: MapEdge, e: React.MouseEvent<SVGLineElement>) => {
        e.stopPropagation();
        if (activeTool === 'select') {
            setSelectedEdgeIds(new Set([edge.id]));
            setSelectedNodeIds(new Set());
        } else if (activeTool === 'edit') {
            setEditingEdgeId(edge.id);
            setEditValue(String(edge.distance));
            setEditingNodeId(null);
            setSelectedEdgeIds(new Set([edge.id]));
            setSelectedNodeIds(new Set());
        } else if (activeTool === 'delete') {
            setMapEdges(prev => prev.filter(e => e.id !== edge.id));
            setSelectedNodeIds(new Set());
            setSelectedEdgeIds(new Set());
        }
    }, [activeTool]);

    // const handleEdgeDistanceChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    //     const value = event.target.value;
    //     if (/^\d*\.?\d*$/.test(value) || value === '') setEditValue(value);
    // }, []);
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
                const nodeId =
                    (e.target.tagName === 'circle'
                        ? e.target.getAttribute('id')
                        : e.target.closest('g')?.querySelector('circle')?.getAttribute('id')) || '';
                const node = mapNodes.find(n => n.id === nodeId);
                if (node) { setIsDraggingNode(true); setDraggedNodeId(node.id); }
            } else {
                setSelectedNodeIds(new Set());
                setSelectedEdgeIds(new Set());
            }
        } else if (activeTool === 'addEdge') {
            if (e.target instanceof Element && (e.target.tagName === 'circle' || e.target.tagName === 'path')) {
                const nodeId =
                    (e.target.tagName === 'circle'
                        ? e.target.getAttribute('id')
                        : e.target.closest('g')?.querySelector('circle')?.getAttribute('id')) || '';
                const node = mapNodes.find(n => n.id === nodeId);
                if (node) {
                    if (!drawingEdgeStartNode) {
                        setDrawingEdgeStartNode(node);
                    } else if (drawingEdgeStartNode.id === node.id) {
                        setDrawingEdgeStartNode(null);
                    } else {
                        if (drawingEdgeStartNode.isHub && node.isHub) { showAlert('Bir TRAFO başka bir TRAFOya bağlanamaz.', 'warning'); setDrawingEdgeStartNode(null); return; }
                        const exists = mapEdges.some(e =>
                            (e.fromNodeId === drawingEdgeStartNode.id && e.toNodeId === node.id) ||
                            (e.fromNodeId === node.id && e.toNodeId === drawingEdgeStartNode.id)
                        );
                        if (exists) { showAlert('Bu bağlantı zaten mevcut.', 'warning'); setDrawingEdgeStartNode(null); return; }
                        setTempTransmissionData({ fromNode: drawingEdgeStartNode, toNode: node });
                        setOpenDetailsModal(true);
                        setDrawingEdgeStartNode(null);
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
                        newEdge.distance = parseFloat(Math.hypot(newEdge.fromX - newEdge.toX, newEdge.fromY - newEdge.toY).toFixed(2));
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
    }, [isPanning, panStartMousePos, scale, isDraggingNode, draggedNodeId, mapNodes, drawingEdgeStartNode, activeTool, getSvgCoordinates, getCenterOfViewBox, isRotating, rotateStartMousePos, rotateStartAngle, getAngle]);

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

    // فقط UPDATE: کل وضعیت فعلی را به والد بده
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
                id: original ? original.id : edge.id, // edge-... هم ممکنه بیاد؛ والد آپدیت کل می‌زنه
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
        const payload = updatedTransmissions.map(t => ({
            ...t,
            distance: Math.round((Number(t.distance) || 0)), // cm integer
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

    // === TRAFO (Hub) ===
    const renderHubNode = () => {
        const hubs = mapNodes.filter(n => n.isHub);
        return (
            <>
                {hubs.map(h => {
                    // const status = getNodeStatus(h.id);
                    const symbol = getMaterialSymbol(h.productTypeCategory);
                    // const stroke = theme.palette.primary.main;
                    const r = 25 / scale;

                    return (
                        <g key={h.id} onClick={(e) => handleNodeClick(h, e as any)} style={{ cursor: 'pointer' }}>
                            {/* بزرگی ناحیه کلیک */}
                            <circle id={h.id} cx={h.x || 0} cy={h.y || 0} r={r} fill="transparent" stroke="transparent" strokeWidth={1 / scale} />
                            {/* مثلث TRAFO */}
                            <path
                                d={`M ${h.x || 0} ${(h.y || 0) - 20 / scale} L ${(h.x || 0) - 20 / scale} ${(h.y || 0) + 20 / scale} L ${(h.x || 0) + 20 / scale} ${(h.y || 0) + 20 / scale} Z`}
                                fill={theme.palette.primary.main}
                                stroke={selectedNodeIds.has(h.id) ? theme.palette.primary.dark : theme.palette.text.primary}
                                strokeWidth={selectedNodeIds.has(h.id) ? 3 / scale : 1 / scale}
                                style={{ pointerEvents: 'none' }}
                            />
                            {/* نام */}
                            <text x={h.x || 0} y={(h.y || 0) + (8 / scale)} fontSize={`${10 / scale}px`} fill="white" textAnchor="middle" dominantBaseline="middle" style={{ pointerEvents: 'none' }}>
                                {h.name}
                            </text>
                            {/* مصالح */}
                            {symbol && (
                                <text x={(h.x || 0) + (30 / scale)} y={(h.y || 0) + (5 / scale)} fontSize={`${12 / scale}px`} fill={textColor} textAnchor="start" style={{ pointerEvents: 'none' }}>
                                    {symbol}
                                </text>
                            )}
                        </g>
                    );
                })}
            </>
        );
    };

    return (
        <Dialog
            open={open}
            onClose={onClose}
            fullScreen   // 👈 تمام‌صفحه
            keepMounted
        >
            <DialogTitle>
                <Stack direction="row" alignItems="center" justifyContent="space-between">
                    <Typography variant="h5">
                        <span style={{ color: theme.palette.primary.main }}>{networkTitle}</span> Ağının İletim Haritası
                    </Typography>
                    <IconButton onClick={onClose}><IconX /></IconButton>
                </Stack>
            </DialogTitle>

            <DialogContent dividers sx={{ p: 0, overflow: 'hidden' }}>
                {transmissions.length === 0 && mapNodes.length === 0 ? (
                    <Box display="flex" justifyContent="center" alignItems="center" sx={{ height: 600 }}>
                        <Typography color="textSecondary">Bu ağ için henüz iletim kaydı bulunamadı. Yeni düğümler ekleyerek başlayabilirsiniz.</Typography>
                    </Box>
                ) : (
                    <Box sx={{ display: 'flex', height: 700 }}>
                        {/* ابزارها */}
                        <Box sx={{ width: '60px', borderRight: '1px solid #eee', p: 1, display: 'flex', flexDirection: 'column', gap: 1, borderRadius: 0 }}>
                            <ToggleButtonGroup
                                orientation="vertical"
                                value={activeTool}
                                exclusive
                                onChange={(_e, newTool) => {
                                    if (newTool !== null) {
                                        setActiveTool(newTool);
                                        setDrawingEdgeStartNode(null);
                                        setEditingNodeId(null);
                                        setEditingEdgeId(null);
                                        setEditValue('');
                                        setIsRotating(false);
                                        setSelectedNodeIds(new Set());
                                        setSelectedEdgeIds(new Set());
                                    }
                                }}
                            >
                                <Tooltip placement="right" title="Seç (Sürükle/Seç)">
                                    <StyledToolButton value="select" aria-label="select"><IconSelect size={20} /></StyledToolButton>
                                </Tooltip>
                                <Tooltip placement="right" title="Kaydır">
                                    <StyledToolButton value="pan" aria-label="pan"><IconHandGrab size={20} /></StyledToolButton>
                                </Tooltip>
                                <Tooltip placement="right" title="Düzenle">
                                    <StyledToolButton value="edit" aria-label="edit"><IconPencil size={20} /></StyledToolButton>
                                </Tooltip>
                                <Tooltip placement="right" title="Düğüm Ekle">
                                    <StyledToolButton value="addNode" aria-label="add node"><IconPlus size={20} /></StyledToolButton>
                                </Tooltip>
                                <Tooltip placement="right" title="Bağlantı Ekle">
                                    <StyledToolButton value="addEdge" aria-label="add edge"><IconLine size={20} /></StyledToolButton>
                                </Tooltip>
                                <Tooltip placement="right" title="TRAFO Ekle">
                                    <StyledToolButton value="addTrafo" aria-label="add trafo"><IconMapPin size={20} /></StyledToolButton>
                                </Tooltip>
                                <Tooltip placement="right" title="Sil">
                                    <StyledToolButton value="delete" aria-label="delete"><IconTrash size={20} /></StyledToolButton>
                                </Tooltip>
                                <Tooltip placement="right" title="Haritayı Çevir">
                                    <StyledToolButton value="rotate-drag" aria-label="rotate"><IconRotate2 size={20} /></StyledToolButton>
                                </Tooltip>
                            </ToggleButtonGroup>

                            <Tooltip placement="right" title="Yakınlaştır">
                                <Button variant="outlined" onClick={() => handleZoom(1.2)} sx={{ mt: 1, minWidth: 0, p: '8px', borderRadius: 0 }}>
                                    <IconPlus size={20} />
                                </Button>
                            </Tooltip>
                            <Tooltip placement="right" title="Uzaklaştır">
                                <Button variant="outlined" onClick={() => handleZoom(1 / 1.2)} sx={{ minWidth: 0, p: '8px', borderRadius: 0 }}>
                                    <IconMinus size={20} />
                                </Button>
                            </Tooltip>
                        </Box>

                        {/* بوم SVG */}
                        <Box
                            ref={svgContainerRef}
                            sx={{
                                flexGrow: 1,
                                border: '1px solid #ccc',
                                overflow: 'hidden',
                                cursor: isPanning ? 'grabbing'
                                    : (activeTool === 'addNode' || activeTool === 'addTrafo') ? 'crosshair'
                                        : (activeTool === 'select') ? (isDraggingNode ? 'grabbing' : 'default')
                                            : (activeTool === 'rotate-drag') ? 'grab'
                                                : (activeTool === 'edit') ? 'text'
                                                    : (activeTool === 'delete') ? 'not-allowed'
                                                        : (activeTool === 'addEdge') ? 'crosshair'
                                                            : 'auto',
                                position: 'relative',
                                borderRadius: 0
                            }}
                            onMouseDown={handleMouseDown}
                            onMouseMove={handleMouseMove}
                            onMouseUp={handleMouseUp}
                            onMouseLeave={handleMouseUp}
                            onWheel={handleWheel}
                        >
                            <svg
                                ref={svgElementRef}
                                width="100%"
                                height="100%"
                                viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`}
                                preserveAspectRatio="xMidYMid meet"
                                style={{ display: 'block' }}
                            >
                                <defs>
                                    {Object.keys(linkColors).map(key => (
                                        <marker key={key} id={`arrowhead-${key.toLowerCase().replace(/ /g, '-')}`} markerWidth="10" markerHeight="7" refX="12" refY="3.5" orient="auto">
                                            <polygon points="0 0, 10 3.5, 0 7" fill={linkColors[key as keyof typeof linkColors]} />
                                        </marker>
                                    ))}
                                </defs>

                                <g ref={svgGroupRef} transform={`rotate(${rotationAngle} ${rotateOriginX} ${rotateOriginY})`}>

                                    {mapEdges.map(edge => (
                                        <g key={edge.id}>
                                            <line
                                                id={edge.id}
                                                x1={edge.fromX} y1={edge.fromY}
                                                x2={edge.toX} y2={edge.toY}
                                                stroke={linkColors[edge.miktarTipi as keyof typeof linkColors] || 'gray'}
                                                strokeWidth={selectedEdgeIds.has(edge.id) ? 4 / scale : 2 / scale}
                                                markerEnd={edge.miktarTipi !== 'TR-Connection' ? `url(#arrowhead-${edge.miktarTipi.toLowerCase().replace(/ /g, '-')})` : undefined}
                                                style={{ cursor: ['select', 'edit', 'delete'].includes(activeTool) ? 'pointer' : 'auto' }}
                                                onClick={(e) => handleEdgeClick(edge, e as any)}
                                            />
                                            {editingEdgeId === edge.id ? (
                                                <foreignObject
                                                    x={(edge.fromX + edge.toX) / 2 - 30 / scale}
                                                    y={(edge.fromY + edge.toY) / 2 - 15 / scale}
                                                    width={60 / scale} height={25 / scale}
                                                >
                                                    <input
                                                        ref={inputRef}
                                                        type="text"
                                                        value={editValue}
                                                        onChange={handleEdgeDistanceChange}
                                                        onBlur={handleEdgeDistanceBlur}
                                                        onKeyDown={handleEdgeDistanceKeyDown}
                                                        onMouseDown={(e) => e.stopPropagation()}
                                                        onClick={(e) => e.stopPropagation()}
                                                        autoFocus
                                                        style={{
                                                            width: '100%', height: '100%', boxSizing: 'border-box',
                                                            textAlign: 'center', fontSize: `${10 / scale}px`,
                                                            background: theme.palette.background.paper, color: textColor,
                                                            border: `1px solid ${theme.palette.primary.main}`, borderRadius: 0, padding: '2px'
                                                        }}
                                                    />
                                                </foreignObject>
                                            ) : (
                                                <text
                                                    x={(edge.fromX + edge.toX) / 2}
                                                    y={(edge.fromY + edge.toY) / 2 - (5 / scale)}
                                                    fontSize={`${10 / scale}px`} fill={textColor} textAnchor="middle"
                                                    style={{ textShadow: `1px 1px 2px ${theme.palette.background.default}`, pointerEvents: activeTool === 'edit' ? 'auto' : 'none', cursor: activeTool === 'edit' ? 'text' : 'auto' }}
                                                    onClick={(e) => handleTextClick(edge.id, 'edge', String(edge.distance), e as any)}
                                                >
                                                    {`${edge.distance}m`}
                                                </text>
                                            )}
                                        </g>
                                    ))}

                                    {/* TRAFO */}
                                    {renderHubNode()}

                                    {/* گره‌های معمولی */}
                                    {mapNodes.filter(n => !n.isHub).map(node => {
                                        const status = getNodeStatus(node.id);
                                        const symbol = getMaterialSymbol(node.productTypeCategory);
                                        const baseStroke = theme.palette.primary.main;
                                        const r = selectedNodeIds.has(node.id) ? 10 / scale : 8 / scale;

                                        // رسم سه‌حالته:
                                        // 0: پر، 1: نیمه‌پر (outline + دایره کوچک پر)، 2: خالی (outline)
                                        return (
                                            <g key={node.id}>
                                                {/* بدنه دایره */}
                                                <circle
                                                    id={node.id}
                                                    cx={node.x || 0}
                                                    cy={node.y || 0}
                                                    r={r}
                                                    fill={status === 0 ? baseStroke : 'transparent'}
                                                    stroke={baseStroke}
                                                    strokeWidth={selectedNodeIds.has(node.id) ? 3 / scale : 2 / scale}
                                                    className={node.isNew ? 'blink-node' : ''}
                                                    style={{ cursor: ['select', 'edit', 'delete', 'addEdge'].includes(activeTool) ? 'pointer' : 'auto' }}
                                                    onClick={(e) => handleNodeClick(node, e as any)}
                                                />
                                                {/* نیمه‌پر: دات داخلی */}
                                                {status === 1 && (
                                                    <circle
                                                        cx={node.x || 0}
                                                        cy={node.y || 0}
                                                        r={4 / scale}
                                                        fill={baseStroke}
                                                        style={{ pointerEvents: 'none' }}
                                                    />
                                                )}

                                                {/* مصالح */}
                                                {symbol && (
                                                    <text
                                                        x={(node.x || 0) + (13 / scale)}
                                                        y={(node.y || 0) - (8 / scale)}
                                                        fontSize={`${10 / scale}px`}
                                                        fill={textColor}
                                                        textAnchor="start"
                                                        style={{ pointerEvents: 'none' }}
                                                    >
                                                        {symbol}
                                                    </text>
                                                )}

                                                {/* نام گره */}
                                                {/* نام گره + آیکون مصالح کنار نام */}
                                                <text
                                                    x={node.x || 0}
                                                    y={(node.y || 0) - (15 / scale)}
                                                    fontSize={`${10 / scale}px`}
                                                    fill={textColor}
                                                    textAnchor="middle"
                                                    style={{
                                                        textShadow: `1px 1px 2px ${theme.palette.background.default}`,
                                                        pointerEvents: 'auto',
                                                        cursor: activeTool === 'edit' ? 'text' : 'auto'
                                                    }}
                                                    onClick={(e) => handleTextClick(node.id, 'node', node.name, e as any)}
                                                >
                                                    <tspan>{node.name}</tspan>
                                                    {symbol && (
                                                        <tspan dx={4 / scale}>{symbol}</tspan>
                                                    )}
                                                </text>

                                            </g>
                                        );
                                    })}

                                    {/* خط در حال رسم */}
                                    {drawingEdgeStartNode && activeTool === 'addEdge' && panStartMousePos && (
                                        <line
                                            x1={drawingEdgeStartNode.x || 0}
                                            y1={drawingEdgeStartNode.y || 0}
                                            x2={getSvgCoordinates(panStartMousePos.x, panStartMousePos.y).x}
                                            y2={getSvgCoordinates(panStartMousePos.x, panStartMousePos.y).y}
                                            stroke="gray"
                                            strokeWidth="1"
                                            strokeDasharray="5,5"
                                        />
                                    )}
                                </g>
                            </svg>
                        </Box>

                        {/* راهنما */}
                        <Box sx={{ width: '260px', borderLeft: '1px solid #eee', p: 2, display: 'flex', flexDirection: 'column', gap: 2, borderRadius: 0, overflow: 'auto' }}>
                            <Typography variant="h6" sx={{ mb: 1 }}>Harita Kılavuzu</Typography>

                            <Stack spacing={1}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <Box sx={{ width: 16, height: 16, bgcolor: theme.palette.primary.main, clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)' }} />
                                    <Typography variant="body2">Merkez Düğüm (TRAFO)</Typography>
                                </Box>

                                <Typography variant="body1" sx={{ fontWeight: 'bold' }}>Düğüm Tipi (Renk/Doluluk)</Typography>
                                {/* YENİ: پر */}
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <Box sx={{ width: 16, height: 16, borderRadius: '50%', bgcolor: theme.palette.primary.main }} />
                                    <Typography variant="body2">YENİ (Dolu)</Typography>
                                </Box>
                                {/* DMM: نیمه‌پر */}
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <Box sx={{
                                        width: 16, height: 16, borderRadius: '50%',
                                        border: `2px solid ${theme.palette.primary.main}`, bgcolor: 'transparent',
                                        display: 'flex', justifyContent: 'center', alignItems: 'center'
                                    }}>
                                        <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: theme.palette.primary.main }} />
                                    </Box>
                                    <Typography variant="body2">DMM (Yarı Dolu)</Typography>
                                </Box>
                                {/* MEVCUT: خالی */}
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <Box sx={{ width: 16, height: 16, borderRadius: '50%', border: `2px solid ${theme.palette.primary.main}`, bgcolor: 'transparent' }} />
                                    <Typography variant="body2">MEVCUT (Boş)</Typography>
                                </Box>

                                <Typography variant="body1" sx={{ fontWeight: 'bold', mt: 1 }}>Direk Malzemesi (Sembol)</Typography>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <Typography variant="body2" component="span">🧱</Typography>
                                    <Typography variant="body2">Beton Direk</Typography>
                                </Box>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <Typography variant="body2" component="span">⚙️</Typography>
                                    <Typography variant="body2">Demir Direk</Typography>
                                </Box>

                                <Typography variant="body1" sx={{ fontWeight: 'bold', mt: 1 }}>Bağlantı Tipi (Çizgi Rengi)</Typography>
                                {Object.keys(linkColors).map(type => (
                                    <Box key={type} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <Box sx={{ width: 24, height: 2, bgcolor: linkColors[type as keyof typeof linkColors] }} />
                                        <Typography variant="body2">{type}</Typography>
                                    </Box>
                                ))}

                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <Box sx={{ width: 24, height: 2, borderBottom: `2px dashed ${theme.palette.grey[500]}` }} />
                                    <Typography variant="body2">Çizim Halindeki Bağlantı</Typography>
                                </Box>
                            </Stack>
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

            <style>
                {`
          @keyframes blink { 0%{opacity:1;} 50%{opacity:.5;} 100%{opacity:1;} }
          .blink-node { animation: blink 1s infinite; }
        `}
            </style>

            {tempTransmissionData && (
                <AddTransmissionDetailsModal
                    open={openDetailsModal}
                    onClose={() => { setOpenDetailsModal(false); setDrawingEdgeStartNode(null); }}
                    onSave={handleSaveTransmissionDetails}
                    fromNode={tempTransmissionData.fromNode}
                    toNode={tempTransmissionData.toNode}
                    itemsList={itemsList}
                    showAlert={showAlert}
                />
            )}

            <SelectTrafoModal
                open={isTrafoModalOpen}
                onClose={() => setIsTrafoModalOpen(false)}
                onSelectTrafo={handleSelectNewTrafo}
                onRegisterNewTrafo={onRegisterNewTrafo}
                showAlert={showAlert}
                availableTrafoOptions={availableTrafoOptionsForMap}
            />

            <SelectProductTypeModal
                open={isProductTypeModalOpen}
                onClose={() => { setIsProductTypeModalOpen(false); setEditingNodeId(null); }}
                onSelectProductType={handleSelectProductType}
                onRegisterNewProductType={onRegisterNewTrafo}
                showAlert={showAlert}
                availableProductTypeOptions={availableProductTypeOptionsForMap}
            />
        </Dialog>
    );
};

export default MapPreviewModal;
