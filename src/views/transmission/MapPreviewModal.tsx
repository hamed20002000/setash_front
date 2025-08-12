import React, { useCallback, useState, useEffect, useRef } from 'react';
import {
    Dialog, DialogTitle, DialogContent, DialogActions,
    Button, Typography, Box, Stack, IconButton,
    ToggleButtonGroup, ToggleButton as MuiToggleButton, Tooltip,
} from '@mui/material';
import { useTheme, styled, Theme } from '@mui/material/styles';
import {
    IconX, IconSelect, IconHandGrab, IconPlus, IconMinus, IconTrash,
    IconLine,
    IconRotate2, IconPencil
} from '@tabler/icons-react';
import * as d3 from 'd3-force';
import { toPng } from 'html-to-image';
import jsPDF from 'jspdf';

import { MapNode, TransmissionRow, SelectOption, MiktarTipi } from './types';

// type MiktarTipi = 'Yeni YG' | 'Yeni AG' | 'DMM YG' | 'DMM AG' | 'TR-Connection';
// interface AddedItem {
//     id: string;
//     name: string;
//     quantity: number;
//     miktarTipi: 'Yeni YG' | 'Yeni AG' | 'DMM YG' | 'DMM AG';
//     weight?: number | null;
//     unit?: {
//         id: string;
//         title: string;
//         recordStatus: number;
//         createAt: string;
//     };
// }

// interface TransmissionRow {
//     id: string;
//     fromProductType: string;
//     toProductType: string;
//     distance: number;
//     miktarTipi: 'Yeni YG' | 'Yeni AG' | 'DMM YG' | 'DMM AG'; // از مقادیر معتبر استفاده می‌کنیم
//     network: string;
//     formulaTitle: string;
//     createAt?: string;
//     recordStatus?: number;
//     fromProductTypeId?: string;
//     toProductTypeId?: string;
//     networkId?: string;
//     fromProductTypeX?: number;
//     fromProductTypeY?: number;
//     toProductTypeX?: number;
//     toProductTypeY?: number;
//     items?: AddedItem[];
// }

// interface MapNode extends d3.SimulationNodeDatum {
//     id: string;
//     name: string;
//     isHub?: boolean;
//     isNew?: boolean;
// }

// interface SelectOption {
//     id: string;
//     name: string;
// }

interface D3MapLink extends d3.SimulationLinkDatum<MapNode> {
    id: string;
    distance: number;
    miktarTipi: MiktarTipi;
}

interface MapEdge {
    id: string;
    fromNodeId: string;
    toNodeId: string;
    fromX: number;
    fromY: number;
    toX: number;
    toY: number;
    distance: number;
    miktarTipi: MiktarTipi;
}

type ToolType = 'select' | 'pan' | 'addNode' | 'addEdge' | 'delete' | 'zoomIn' | 'zoomOut' | 'rotate-drag' | 'edit';

const StyledToolButton = styled(MuiToggleButton)(({ theme }) => ({
    '&.Mui-selected': {
        backgroundColor: theme.palette.primary.main,
        color: 'white',
        '&:hover': {
            backgroundColor: theme.palette.primary.dark,
        },
    },
    '&:not(.Mui-selected)': {
        backgroundColor: theme.palette.background.paper,
        color: theme.palette.text.primary,
        '&:hover': {
            backgroundColor: theme.palette.action.hover,
        },
    },
    borderRadius: '0px',
    minWidth: 'unset',
    padding: '8px',
}));

const getContrastingTextColor = (theme: Theme) => {
    return theme.palette.mode === 'dark' ? 'white' : 'black';
};

const linkColors = {
    'Yeni YG': '#4CAF50',
    'Yeni AG': '#FFC107',
    'DMM YG': '#FF69B4',
    'DMM AG': '#E91E63',
    'TR-Connection': '#2196F3',
};

interface MapPreviewModalProps {
    open: boolean;
    onClose: () => void;
    transmissions: TransmissionRow[];
    networkId: string | undefined;
    networkTitle: string;
    onUpdateTransmissions: (newTransmissions: TransmissionRow[]) => void;
    onSaveMapChanges: (updatedTransmissions: TransmissionRow[], newlyCreatedNodes: MapNode[]) => void;
    allProductTypes: SelectOption[];
}

const MapPreviewModal: React.FC<MapPreviewModalProps> = ({ open, onClose, transmissions, networkId, networkTitle, onSaveMapChanges, allProductTypes }) => {
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
    const [dragStartNodePos, setDragStartNodePos] = useState({ x: 0, y: 0 });
    const [isPanning, setIsPanning] = useState<boolean>(false);
    const [panStartMousePos, setPanStartMousePos] = useState({ x: 0, y: 0 });
    const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
    const [editingEdgeId, setEditingEdgeId] = useState<string | null>(null);
    const [editValue, setEditValue] = useState<string>('');
    const [mapNodes, setMapNodes] = useState<MapNode[]>([]);
    const [mapEdges, setMapEdges] = useState<MapEdge[]>([]);




    const convertTransmissionsToMapData = useCallback((currentTransmissions: TransmissionRow[]) => {
        const nodesMap = new Map<string, MapNode>();
        const links: D3MapLink[] = [];
        const allProductTypeNames = new Set(allProductTypes.map(p => p.name));
        const allFromProductTypes = new Set(currentTransmissions.map(t => t.fromProductType));
        const allToProductTypes = new Set(currentTransmissions.map(t => t.toProductType));
        let hubNodeId = '';
        const possibleHubs = Array.from(allFromProductTypes).filter(nodeId => !allToProductTypes.has(nodeId));
        if (possibleHubs.length > 0) {
            hubNodeId = possibleHubs[0];
        }

        currentTransmissions.forEach(t => {
            if (!nodesMap.has(t.fromProductType)) {
                nodesMap.set(t.fromProductType, {
                    id: t.fromProductType,
                    name: t.fromProductType,
                    x: t.fromProductTypeX,
                    y: t.fromProductTypeY,
                    fx: t.fromProductTypeX,
                    fy: t.fromProductTypeY,
                    isNew: !allProductTypeNames.has(t.fromProductType)
                });
            }
            if (!nodesMap.has(t.toProductType)) {
                nodesMap.set(t.toProductType, {
                    id: t.toProductType,
                    name: t.toProductType,
                    x: t.toProductTypeX,
                    y: t.toProductTypeY,
                    fx: t.toProductTypeX,
                    fy: t.toProductTypeY,
                    isNew: !allProductTypeNames.has(t.toProductType)
                });
            }
        });

        if (hubNodeId && nodesMap.has(hubNodeId)) {
            const hubNode = nodesMap.get(hubNodeId)!;
            hubNode.isHub = true;
            hubNode.fx = initialViewWidth / 2;
            hubNode.fy = initialViewHeight / 2;
        }

        currentTransmissions.forEach(t => {
            const fromNode = nodesMap.get(t.fromProductType);
            const toNode = nodesMap.get(t.toProductType);

            if (fromNode && toNode) {
                const isConnectionToHub = fromNode.id === hubNodeId || toNode.id === hubNodeId;
                const newMiktarTipi: MiktarTipi = isConnectionToHub ? 'TR-Connection' : t.miktarTipi; // مقداردهی مستقیم و حذف منطق اضافی

                links.push({
                    id: t.id,
                    source: fromNode,
                    target: toNode,
                    distance: t.distance,
                    miktarTipi: newMiktarTipi,
                });
            }
        });

        return { nodes: Array.from(nodesMap.values()), links };
    }, [initialViewHeight, initialViewWidth, allProductTypes]);

    const applyForceLayout = useCallback((nodes: MapNode[], links: D3MapLink[], runSimulation: boolean) => {
        if (!runSimulation) {
            return {
                nodes: nodes,
                edges: links.map(link => {
                    const sourceNode = link.source as MapNode;
                    const targetNode = link.target as MapNode;
                    return {
                        id: link.id,
                        fromNodeId: sourceNode.id,
                        toNodeId: targetNode.id,
                        fromX: sourceNode.x || 0,
                        fromY: sourceNode.y || 0,
                        toX: targetNode.x || 0,
                        toY: targetNode.y || 0,
                        distance: link.distance,
                        miktarTipi: link.miktarTipi
                    };
                })
            };
        }

        const simulation = d3.forceSimulation(nodes)
            .force('link', d3.forceLink<MapNode, D3MapLink>(links).id(d => d.id).distance(150))
            .force('charge', d3.forceManyBody().strength(-1000)) // افزایش نیروی دافعه برای دور کردن گره‌ها
            .force('collide', d3.forceCollide(35)) // افزایش شعاع برخورد برای جلوگیری از همپوشانی
        // .force('center', d3.forceCenter(initialViewWidth / 2, initialViewHeight / 2)) // می‌توانید این خط را حذف یا غیرفعال کنید

        simulation.stop();
        for (let i = 0; i < 300; ++i) simulation.tick();

        return {
            nodes: nodes,
            edges: links.map(link => {
                const sourceNode = link.source as MapNode;
                const targetNode = link.target as MapNode;
                return {
                    id: link.id,
                    fromNodeId: sourceNode.id,
                    toNodeId: targetNode.id,
                    fromX: sourceNode.x || 0,
                    fromY: sourceNode.y || 0,
                    toX: targetNode.x || 0,
                    toY: targetNode.y || 0,
                    distance: link.distance,
                    miktarTipi: link.miktarTipi
                };
            })
        };
    }, [initialViewHeight, initialViewWidth]);

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
            return;
        }

        if (transmissions.length > 0) {
            const { nodes, links } = convertTransmissionsToMapData(transmissions);
            const hasInitialCoordinates = nodes.some(node => node.x !== undefined && node.y !== undefined);
            const layoutedData = applyForceLayout(nodes, links, !hasInitialCoordinates);
            setMapNodes(layoutedData.nodes);
            setMapEdges(layoutedData.edges);

            if (svgContainerRef.current && layoutedData.nodes.length > 0) {
                const allXs = layoutedData.nodes.map(n => n.x || 0);
                const allYs = layoutedData.nodes.map(n => n.y || 0);
                const minX = Math.min(...allXs) - 50;
                const minY = Math.min(...allYs) - 50;
                const maxX = Math.max(...allXs) + 50;
                const maxY = Math.max(...allYs) + 50;
                const newWidth = maxX - minX;
                const newHeight = maxY - minY;
                setViewBox({ x: minX, y: minY, width: newWidth, height: newHeight });
            } else {
                setViewBox({ x: 0, y: 0, width: initialViewWidth, height: initialViewHeight });
            }
        } else {
            setMapNodes([]);
            setMapEdges([]);
            setViewBox({ x: 0, y: 0, width: initialViewWidth, height: initialViewHeight });
        }
    }, [open, transmissions, convertTransmissionsToMapData, applyForceLayout, initialViewWidth, initialViewHeight]);

    const getCenterOfViewBox = useCallback(() => {
        return {
            x: viewBox.x + viewBox.width / 2,
            y: viewBox.y + viewBox.height / 2
        };
    }, [viewBox]);

    const getAngle = useCallback((p1: { x: number, y: number }, p2: { x: number, y: number }) => {
        return Math.atan2(p2.y - p1.y, p2.x - p1.x) * 180 / Math.PI;
    }, []);

    useEffect(() => {
        if (editingNodeId || editingEdgeId) {
            inputRef.current?.focus();
        }
    }, [editingNodeId, editingEdgeId]);

    const getSvgCoordinates = useCallback((clientX: number, clientY: number) => {
        if (!svgElementRef.current) return { x: 0, y: 0 };
        const svgPoint = svgElementRef.current.createSVGPoint();
        svgPoint.x = clientX;
        svgPoint.y = clientY;
        const CTM = svgElementRef.current.getScreenCTM();
        if (CTM) {
            const inverseCTM = CTM.inverse();
            const transformedPoint = svgPoint.matrixTransform(inverseCTM);
            return { x: transformedPoint.x, y: transformedPoint.y };
        }
        return { x: 0, y: 0 };
    }, []);

    const handleNodeClick = useCallback((node: MapNode, event: React.MouseEvent<SVGCircleElement>) => {
        event.stopPropagation();
        if (activeTool === 'select') {
            setSelectedNodeIds(new Set([node.id]));
            setSelectedEdgeIds(new Set());
        } else if (activeTool === 'edit') {
            if (!node.isHub) {
                setEditingNodeId(node.id);
                setEditValue(node.name);
                setEditingEdgeId(null);
                setSelectedNodeIds(new Set([node.id]));
                setSelectedEdgeIds(new Set());
            }
        } else if (activeTool === 'delete') {
            if (!node.isHub) {
                setMapNodes(prevNodes => prevNodes.filter(n => n.id !== node.id));
                setMapEdges(prevEdges => prevEdges.filter(e => e.fromNodeId !== node.id && e.toNodeId !== node.id));
            }
            setSelectedNodeIds(new Set());
            setSelectedEdgeIds(new Set());
        }
    }, [activeTool, mapNodes, mapEdges]);

    const handleNodeNameChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
        setEditValue(event.target.value);
    }, []);

    const handleNodeNameSave = useCallback(() => {
        if (editingNodeId) {
            const isDuplicate = allProductTypes.some(p => p.name === editValue);
            const existingNode = mapNodes.find(n => n.name === editValue && n.id !== editingNodeId);
            const isNew = !isDuplicate && !existingNode;
            setMapNodes(prevNodes => {
                const updatedNodes = prevNodes.map(node =>
                    node.id === editingNodeId ? { ...node, name: editValue, isNew: isNew } : node
                );
                return updatedNodes;
            });
            setEditingNodeId(null);
            setEditValue('');
        }
    }, [editingNodeId, editValue, allProductTypes, mapNodes]);

    const handleNodeNameBlur = useCallback(() => {
        if (editingNodeId) {
            handleNodeNameSave();
        }
    }, [editingNodeId, handleNodeNameSave]);

    const handleNodeNameKeyDown = useCallback((event: React.KeyboardEvent<HTMLInputElement>) => {
        event.stopPropagation();
        if (event.key === 'Enter') {
            handleNodeNameSave();
        }
        if (event.key === 'Escape') {
            setEditingNodeId(null);
            setEditValue('');
        }
    }, [handleNodeNameSave]);

    const handleEdgeClick = useCallback((edge: MapEdge, event: React.MouseEvent<SVGLineElement>) => {
        event.stopPropagation();
        if (activeTool === 'select') {
            setSelectedEdgeIds(new Set([edge.id]));
            setSelectedNodeIds(new Set());
        } else if (activeTool === 'edit') {
            // if (edge.miktarTipi !== 'TR-Connection') {
            setEditingEdgeId(edge.id);
            setEditValue(String(edge.distance));
            setEditingNodeId(null);
            setSelectedEdgeIds(new Set([edge.id]));
            setSelectedNodeIds(new Set());
            // }
        } else if (activeTool === 'delete') {
            setMapEdges(prevEdges => prevEdges.filter(e => e.id !== edge.id));
            setSelectedNodeIds(new Set());
            setSelectedEdgeIds(new Set());
        }
    }, [activeTool, mapEdges]);

    const handleTextClick = useCallback((id: string, type: 'node' | 'edge', value: string, event: React.MouseEvent<SVGTextElement>) => {
        event.stopPropagation();
        if (activeTool === 'edit') {
            if (type === 'node') {
                const node = mapNodes.find(n => n.id === id);
                if (node && !node.isHub) {
                    setEditingNodeId(id);
                    setEditValue(value);
                    setEditingEdgeId(null);
                    setSelectedNodeIds(new Set([id]));
                    setSelectedEdgeIds(new Set());
                }
            } else if (type === 'edge') {
                // const edge = mapEdges.find(e => e.id === id);
                // if (edge && edge.miktarTipi !== 'TR-Connection') {
                setEditingEdgeId(id);
                setEditValue(value);
                setEditingNodeId(null);
                setSelectedEdgeIds(new Set([id]));
                setSelectedNodeIds(new Set());
                // }
            }
        }
    }, [activeTool, mapNodes, mapEdges]);

    const handleEdgeDistanceChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
        const value = event.target.value;
        if (/^\d*\.?\d*$/.test(value) || value === '') {
            setEditValue(value);
        }
    }, []);

    const handleEdgeDistanceSave = useCallback(() => {
        if (editingEdgeId) {
            const newDistance = parseFloat(editValue);
            if (!isNaN(newDistance) && newDistance >= 0) {
                setMapEdges(prevEdges => prevEdges.map(edge =>
                    edge.id === editingEdgeId ? { ...edge, distance: newDistance } : edge
                ));
            }
            setEditingEdgeId(null);
            setEditValue('');
        }
    }, [editingEdgeId, editValue]);

    const handleEdgeDistanceBlur = useCallback(() => {
        if (editingEdgeId) {
            handleEdgeDistanceSave();
        }
    }, [editingEdgeId, handleEdgeDistanceSave]);

    const handleEdgeDistanceKeyDown = useCallback((event: React.KeyboardEvent<HTMLInputElement>) => {
        event.stopPropagation();
        if (event.key === 'Enter') {
            handleEdgeDistanceSave();
        }
        if (event.key === 'Escape') {
            setEditingEdgeId(null);
            setEditValue('');
        }
    }, [handleEdgeDistanceSave]);

    const handleMouseDown = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
        event.preventDefault();
        if ((editingNodeId || editingEdgeId) && inputRef.current && !inputRef.current.contains(event.target as Node)) {
            if (editingNodeId) handleNodeNameSave();
            if (editingEdgeId) handleEdgeDistanceSave();
            setEditingNodeId(null);
            setEditingEdgeId(null);
            setEditValue('');
            return;
        }
        if ((editingNodeId || editingEdgeId) && inputRef.current && inputRef.current.contains(event.target as Node)) {
            return;
        }

        const { x: svgX, y: svgY } = getSvgCoordinates(event.clientX, event.clientY);
        if (activeTool === 'pan') {
            setIsPanning(true);
            setPanStartMousePos({ x: event.clientX, y: event.clientY });
        } else if (activeTool === 'select') {
            if (event.target instanceof Element && (event.target.tagName === 'circle' || event.target.tagName === 'path')) {
                const nodeId = event.target.id;
                const node = mapNodes.find(n => n.id === nodeId);
                if (node) {
                    setIsDraggingNode(true);
                    setDraggedNodeId(node.id);
                    setDragStartNodePos({ x: node.x || 0, y: node.y || 0 });
                }
            } else {
                setSelectedNodeIds(new Set());
                setSelectedEdgeIds(new Set());
            }
        } else if (activeTool === 'addNode') {
            const newNode: MapNode = {
                id: `node-${Date.now()}`,
                name: `Yeni Ürün ${mapNodes.filter(n => !n.isHub).length + 1}`,
                x: svgX,
                y: svgY,
                isNew: true,
            };
            setMapNodes(prev => [...prev, newNode]);
            setEditingNodeId(newNode.id);
            setEditValue(newNode.name);
            setEditingEdgeId(null);
        } else if (activeTool === 'addEdge') {
            if (event.target instanceof Element && (event.target.tagName === 'circle' || event.target.tagName === 'path')) {
                const nodeId = event.target.id;
                const node = mapNodes.find(n => n.id === nodeId);
                if (node) {
                    if (!drawingEdgeStartNode) {
                        setDrawingEdgeStartNode(node);
                    } else if (drawingEdgeStartNode.id === node.id) {
                        setDrawingEdgeStartNode(null);
                    } else {
                        const edgeExists = mapEdges.some(e =>
                            (e.fromNodeId === drawingEdgeStartNode.id && e.toNodeId === node.id) ||
                            (e.fromNodeId === node.id && e.toNodeId === drawingEdgeStartNode.id)
                        );
                        if (edgeExists) {
                            setDrawingEdgeStartNode(null);
                            return;
                        }

                        const miktarTipi = drawingEdgeStartNode.isHub || node.isHub ? 'TR-Connection' : 'Yeni YG';
                        const newEdge: MapEdge = {
                            id: `edge-${Date.now()}`,
                            fromNodeId: drawingEdgeStartNode.id,
                            toNodeId: node.id,
                            fromX: drawingEdgeStartNode.x || 0,
                            fromY: drawingEdgeStartNode.y || 0,
                            toX: node.x || 0,
                            toY: node.y || 0,
                            distance: parseFloat((Math.sqrt(Math.pow((drawingEdgeStartNode.x || 0) - (node.x || 0), 2) + Math.pow((drawingEdgeStartNode.y || 0) - (node.y || 0), 2))).toFixed(2)),
                            miktarTipi: miktarTipi as MiktarTipi
                        };
                        setMapEdges(prev => [...prev, newEdge]);
                        if (miktarTipi !== 'TR-Connection') {
                            setEditingEdgeId(newEdge.id);
                            setEditValue(String(newEdge.distance));
                        }
                        setEditingNodeId(null);
                        setDrawingEdgeStartNode(null);
                    }
                }
            }
        } else if (activeTool === 'rotate-drag') {
            setIsRotating(true);
            setRotateStartMousePos({ x: event.clientX, y: event.clientY });
            setRotateStartAngle(rotationAngle);
        } else if (activeTool === 'edit' || activeTool === 'delete') {
            if (!(event.target instanceof Element && (event.target.tagName === 'circle' || event.target.tagName === 'line' || event.target.tagName === 'text' || event.target.tagName === 'input' || event.target.tagName === 'foreignObject' || event.target.tagName === 'path'))) {
                setEditingNodeId(null);
                setEditingEdgeId(null);
                setEditValue('');
                setSelectedNodeIds(new Set());
                setSelectedEdgeIds(new Set());
            }
        }
    }, [activeTool, mapNodes, mapEdges, drawingEdgeStartNode, getSvgCoordinates, editingNodeId, editingEdgeId, getCenterOfViewBox, rotationAngle, getAngle, inputRef, handleNodeNameSave, handleEdgeDistanceSave]);

    const handleMouseMove = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
        if (isPanning) {
            const dx = (event.clientX - panStartMousePos.x) / scale;
            const dy = (event.clientY - panStartMousePos.y) / scale;
            setViewBox(prev => ({ ...prev, x: prev.x - dx, y: prev.y - dy }));
            setPanStartMousePos({ x: event.clientX, y: event.clientY });
        } else if (isDraggingNode && draggedNodeId) {
            const { x: newSvgX, y: newSvgY } = getSvgCoordinates(event.clientX, event.clientY);
            const draggedNode = mapNodes.find(n => n.id === draggedNodeId);
            if (!draggedNode) return;
            const updatedNodes = mapNodes.map(node =>
                node.id === draggedNodeId
                    ? { ...node, x: newSvgX, y: newSvgY }
                    : node
            );
            setMapNodes(updatedNodes);

            setMapEdges(prevEdges => prevEdges.map(edge => {
                if (edge.fromNodeId === draggedNodeId || edge.toNodeId === draggedNodeId) {
                    let updatedEdge = { ...edge };
                    const fromNode = updatedNodes.find(n => n.id === updatedEdge.fromNodeId);
                    const toNode = updatedNodes.find(n => n.id === updatedEdge.toNodeId);
                    if (fromNode && toNode) {
                        updatedEdge.fromX = fromNode.x || 0;
                        updatedEdge.fromY = fromNode.y || 0;
                        updatedEdge.toX = toNode.x || 0;
                        updatedEdge.toY = toNode.y || 0;
                        updatedEdge.distance = parseFloat((Math.sqrt(Math.pow(updatedEdge.fromX - updatedEdge.toX, 2) + Math.pow(updatedEdge.fromY - updatedEdge.toY, 2))).toFixed(2));
                    }
                    return updatedEdge;
                }
                return edge;
            }));
        } else if (activeTool === 'addEdge' && drawingEdgeStartNode) {
            setPanStartMousePos({ x: event.clientX, y: event.clientY });
        } else if (isRotating && activeTool === 'rotate-drag') {
            const center = getCenterOfViewBox();
            const currentMousePos = { x: event.clientX, y: event.clientY };
            const startAngleFromCenter = getAngle(center, rotateStartMousePos);
            const currentAngleFromCenter = getAngle(center, currentMousePos);
            const deltaAngle = currentAngleFromCenter - startAngleFromCenter;
            setRotationAngle(rotateStartAngle + deltaAngle);
        }
    }, [isPanning, panStartMousePos, scale, isDraggingNode, draggedNodeId, dragStartNodePos, mapNodes, drawingEdgeStartNode, activeTool, getSvgCoordinates, getCenterOfViewBox, isRotating, rotateStartMousePos, rotateStartAngle, getAngle, setMapNodes, setMapEdges]);


    const handleMouseUp = useCallback(() => {
        setIsPanning(false);
        setIsDraggingNode(false);
        setDraggedNodeId(null);
        setIsRotating(false);
    }, []);

    const handleZoom = useCallback((zoomFactor: number) => {
        const centerX = viewBox.x + viewBox.width / 2;
        const centerY = viewBox.y + viewBox.height / 2;
        const newWidth = viewBox.width / zoomFactor;
        const newHeight = viewBox.height / zoomFactor;
        setViewBox({
            x: centerX - newWidth / 2,
            y: centerY - newHeight / 2,
            width: newWidth,
            height: newHeight
        });
        setScale(prevScale => prevScale * zoomFactor);
    }, [viewBox]);

    const handleWheel = useCallback((event: React.WheelEvent<HTMLDivElement>) => {
        event.preventDefault();
        const zoomFactor = 1.1;
        const mouseX = event.clientX;
        const mouseY = event.clientY;
        const svgCoords = getSvgCoordinates(mouseX, mouseY);
        const newWidth = viewBox.width / (event.deltaY < 0 ? zoomFactor : 1 / zoomFactor);
        const newHeight = viewBox.height / (event.deltaY < 0 ? zoomFactor : 1 / zoomFactor);
        setViewBox({
            x: svgCoords.x - (svgCoords.x - viewBox.x) * (newWidth / viewBox.width),
            y: svgCoords.y - (svgCoords.y - viewBox.y) * (newHeight / viewBox.height),
            width: newWidth,
            height: newHeight
        });
        setScale(prevScale => prevScale * (event.deltaY < 0 ? zoomFactor : 1 / zoomFactor));
    }, [viewBox, getSvgCoordinates]);

    // const handleSaveChanges = useCallback(() => {
    //     const existingNodeNames = new Set(allProductTypes.map(p => p.name));
    //     const newlyCreatedNodes = mapNodes
    //         .filter(node => node.isNew && !existingNodeNames.has(node.name));

    //     const updatedTransmissions: TransmissionRow[] = mapEdges
    //         .filter(edge => edge.miktarTipi !== 'TR-Connection')
    //         .map(edge => {
    //             const fromNode = mapNodes.find(node => node.id === edge.fromNodeId);
    //             const toNode = mapNodes.find(node => node.id === edge.toNodeId);
    //             const originalTransmission = transmissions.find(t => t.id === edge.id);

    //             return {
    //                 id: edge.id,
    //                 fromProductType: fromNode?.name || '',
    //                 toProductType: toNode?.name || '',
    //                 distance: edge.distance,
    //                 miktarTipi: (originalTransmission?.miktarTipi || 'Yeni YG') as 'Yeni YG' | 'Yeni AG' | 'DMM YG' | 'DMM AG',
    //                 network: originalTransmission?.network || networkTitle,
    //                 formulaTitle: originalTransmission?.formulaTitle || 'Oto-Oluşturulan',
    //                 networkId: originalTransmission?.networkId || networkId,
    //                 fromProductTypeId: fromNode?.id || '',
    //                 toProductTypeId: toNode?.id || '',
    //                 fromProductTypeX: fromNode?.x,
    //                 toProductTypeX: toNode?.x,
    //                 fromProductTypeY: fromNode?.y,
    //                 toProductTypeY: toNode?.y,
    //             };
    //         });
    //     debugger
    //     onSaveMapChanges(updatedTransmissions, newlyCreatedNodes);
    //     onClose();
    // }, [mapEdges, mapNodes, networkTitle, networkId, onSaveMapChanges, onClose, transmissions, allProductTypes]);


    // const handleSaveChanges = useCallback(() => {
    //     const productTypeNameToIdMap = new Map(allProductTypes.map(p => [p.name, p.id]));

    //     const newlyCreatedNodes = mapNodes
    //         .filter(node => node.isNew);

    //     const updatedTransmissions: TransmissionRow[] = mapEdges
    //         .map(edge => {
    //             const fromNode = mapNodes.find(node => node.id === edge.fromNodeId);
    //             const toNode = mapNodes.find(node => node.id === edge.toNodeId);

    //             // پیدا کردن ردیف اصلی برای حفظ تمام اطلاعات
    //             const originalTransmission = transmissions.find(t => t.id === edge.id);

    //             const fromProductTypeId = originalTransmission?.fromProductTypeId || productTypeNameToIdMap.get(fromNode?.name || '') || '';
    //             const toProductTypeId = originalTransmission?.toProductTypeId || productTypeNameToIdMap.get(toNode?.name || '') || '';

    //             const originalMiktarTipi = originalTransmission?.miktarTipi || 'Yeni YG';
    //             const originalItems = originalTransmission?.items || [];

    //             return {
    //                 id: edge.id,
    //                 fromProductType: fromNode?.name || '',
    //                 toProductType: toNode?.name || '',
    //                 distance: edge.distance,
    //                 miktarTipi: originalMiktarTipi,
    //                 network: originalTransmission?.network || networkTitle,
    //                 formulaTitle: originalTransmission?.formulaTitle || 'Oto-Oluşturulan',
    //                 networkId: originalTransmission?.networkId || networkId,
    //                 fromProductTypeId: fromProductTypeId,
    //                 toProductTypeId: toProductTypeId,
    //                 fromProductTypeX: fromNode?.x,
    //                 toProductTypeX: toNode?.x,
    //                 fromProductTypeY: fromNode?.y,
    //                 toProductTypeY: toNode?.y,
    //                 items: originalItems, // ✅ آیتم‌های اصلی را به ردیف جدید اضافه می‌کند
    //             };
    //         });

    //     onSaveMapChanges(updatedTransmissions, newlyCreatedNodes);
    //     onClose();
    // }, [mapEdges, mapNodes, networkTitle, networkId, onSaveMapChanges, onClose, transmissions, allProductTypes]);



    const handleSaveChanges = useCallback(() => {
        const productTypeNameToIdMap = new Map(allProductTypes.map(p => [p.name, p.id]));
        const existingProductTypeNames = new Set(allProductTypes.map(p => p.name.toLowerCase()));

        // Yalnızca yeni olan ve sistemde kayıtlı olmayan düğümleri buluyoruz
        const newlyCreatedNodes = mapNodes
            .filter(node => !existingProductTypeNames.has(node.name.toLowerCase()));

        // Güncellenmiş iletim listesini oluşturuyoruz
        const updatedTransmissions: TransmissionRow[] = mapEdges
            .map(edge => {
                // ... (منطق تبدیل داده‌ها به TransmissionRow مانند قبل)
                const fromNode = mapNodes.find(node => node.id === edge.fromNodeId);
                const toNode = mapNodes.find(node => node.id === edge.toNodeId);
                const originalTransmission = transmissions.find(t => t.id === edge.id);
                const fromProductTypeId = originalTransmission?.fromProductTypeId || productTypeNameToIdMap.get(fromNode?.name || '') || '';
                const toProductTypeId = originalTransmission?.toProductTypeId || productTypeNameToIdMap.get(toNode?.name || '') || '';
                const originalMiktarTipi = originalTransmission?.miktarTipi || 'Yeni YG';
                const originalItems = originalTransmission?.items || [];

                return {
                    id: edge.id,
                    fromProductType: fromNode?.name || '',
                    toProductType: toNode?.name || '',
                    distance: edge.distance,
                    miktarTipi: originalMiktarTipi,
                    network: originalTransmission?.network || networkTitle,
                    formulaTitle: originalTransmission?.formulaTitle || 'Oto-Oluşturulan',
                    networkId: originalTransmission?.networkId || networkId,
                    fromProductTypeId: fromProductTypeId,
                    toProductTypeId: toProductTypeId,
                    fromProductTypeX: fromNode?.x,
                    toProductTypeX: toNode?.x,
                    fromProductTypeY: fromNode?.y,
                    toProductTypeY: toNode?.y,
                    items: originalItems,
                };
            });

        // ✅ MapPreviewModal'ın tek görevi, veriyi ebeveyne gönderip kapanmaktır.
        onSaveMapChanges(updatedTransmissions, newlyCreatedNodes);
        onClose();
    }, [mapEdges, mapNodes, networkTitle, networkId, onSaveMapChanges, onClose, transmissions, allProductTypes]);



    const handleDownload = useCallback((format: 'png' | 'pdf') => {
        if (svgContainerRef.current) {
            toPng(svgContainerRef.current, { backgroundColor: '#fff' })
                .then(function (dataUrl) {
                    if (format === 'png') {
                        const link = document.createElement('a');
                        link.download = `${networkTitle}_map.png`;
                        link.href = dataUrl;
                        link.click();
                    } else if (format === 'pdf') {
                        const pdf = new jsPDF('l', 'mm', 'a4');
                        const imgWidth = 280;
                        const imgHeight = (pdf.internal.pageSize.getHeight() * imgWidth) / pdf.internal.pageSize.getWidth();
                        pdf.addImage(dataUrl, 'PNG', 5, 5, imgWidth, imgHeight);
                        pdf.save(`${networkTitle}_map.pdf`);
                    }
                })
                .catch(function (error) {
                    console.error('oops, something went wrong!', error);
                });
        }
    }, [networkTitle]);

    if (!open) return null;

    const { x: rotateOriginX, y: rotateOriginY } = getCenterOfViewBox();

    const renderHubNode = () => {
        const hubNode = mapNodes.find(n => n.isHub);
        if (!hubNode) return null;
        return (
            <g key={hubNode.id}>
                <path
                    id={hubNode.id}
                    d={`M ${hubNode.x || 0} ${(hubNode.y || 0) - 20 / scale} L ${(hubNode.x || 0) - 20 / scale} ${(hubNode.y || 0) + 20 / scale} L ${(hubNode.x || 0) + 20 / scale} ${(hubNode.y || 0) + 20 / scale} Z`}
                    fill={theme.palette.primary.main}
                    stroke={selectedNodeIds.has(hubNode.id) ? theme.palette.primary.dark : theme.palette.text.primary}
                    strokeWidth={selectedNodeIds.has(hubNode.id) ? 3 / scale : 1 / scale}
                    style={{ cursor: 'pointer' }}
                    onClick={(e) => handleNodeClick(hubNode, e as React.MouseEvent<SVGCircleElement>)}
                />
                <text
                    x={hubNode.x || 0}
                    y={(hubNode.y || 0) + (8 / scale)}
                    fontSize={`${10 / scale}px`}
                    fill="white"
                    textAnchor="middle"
                    dominantBaseline="middle"
                    style={{ pointerEvents: 'none' }}
                >
                    {hubNode.name}
                </text>
            </g>
        );
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="xl" fullWidth>
            <DialogTitle>
                <Stack direction="row" alignItems="center" justifyContent="space-between">
                    <Typography variant="h5">
                        <span style={{ color: theme.palette.primary.main }}>{networkTitle}</span> Ağının İletim Haritası
                    </Typography>
                    <IconButton onClick={onClose}>
                        <IconX />
                    </IconButton>
                </Stack>
            </DialogTitle>
            <DialogContent dividers sx={{ p: 0, overflow: 'hidden' }}>
                {transmissions.length === 0 && mapNodes.length === 0 ? (
                    <Box display="flex" justifyContent="center" alignItems="center" sx={{ height: 600 }}>
                        <Typography color="textSecondary">
                            Bu ağ için henüz iletim kaydı bulunamadı. Yeni düğümler ekleyerek başlayabilirsiniz.
                        </Typography>
                    </Box>
                ) : (
                    <Box sx={{ display: 'flex', height: 700 }}>
                        <Box sx={{ width: '60px', borderRight: '1px solid #eee', p: 1, display: 'flex', flexDirection: 'column', gap: 1, borderRadius: 0 }}>
                            <ToggleButtonGroup
                                orientation="vertical"
                                value={activeTool}
                                exclusive
                                onChange={(_event, newTool) => {
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
                                <Tooltip placement="right" title="Seç (Sürüklemek için sürükle, öğeleri seç)">
                                    <StyledToolButton value="select" aria-label="select">
                                        <IconSelect size={20} />
                                    </StyledToolButton>
                                </Tooltip>
                                <Tooltip placement="right" title="Kaydırma (Haritayı hareket ettir)">
                                    <StyledToolButton value="pan" aria-label="pan">
                                        <IconHandGrab size={20} />
                                    </StyledToolButton>
                                </Tooltip>
                                <Tooltip placement="right" title="Düzenle (Adları ve mesafeleri değiştirmek için öğelere tıklayın)">
                                    <StyledToolButton value="edit" aria-label="edit">
                                        <IconPencil size={20} />
                                    </StyledToolButton>
                                </Tooltip>
                                <Tooltip placement="right" title="Düğüm Ekle (Haritada yeni bir nokta oluştur)">
                                    <StyledToolButton value="addNode" aria-label="add node">
                                        <IconPlus size={20} />
                                    </StyledToolButton>
                                </Tooltip>
                                <Tooltip placement="right" title="Bağlantı Ekle (İki düğüm arasına hat çek)">
                                    <StyledToolButton value="addEdge" aria-label="add edge">
                                        <IconLine size={20} />
                                    </StyledToolButton>
                                </Tooltip>
                                <Tooltip placement="right" title="Sil">
                                    <StyledToolButton value="delete" aria-label="delete">
                                        <IconTrash size={20} />
                                    </StyledToolButton>
                                </Tooltip>
                                <Tooltip placement="right" title="Haritayı Çevir (Sürükleyerek)">
                                    <StyledToolButton value="rotate-drag" aria-label="rotate">
                                        <IconRotate2 size={20} />
                                    </StyledToolButton>
                                </Tooltip>
                            </ToggleButtonGroup>
                            <Tooltip placement="right" title="Yakınlaştır">
                                <Button
                                    variant="outlined"
                                    onClick={() => handleZoom(1.2)}
                                    sx={{ mt: 1, minWidth: 0, padding: '8px', borderRadius: 0 }}
                                >
                                    <IconPlus size={20} />
                                </Button>
                            </Tooltip>
                            <Tooltip placement="right" title="Uzaklaştır">
                                <Button
                                    variant="outlined"
                                    onClick={() => handleZoom(1 / 1.2)}
                                    sx={{ minWidth: 0, padding: '8px', borderRadius: 0 }}
                                >
                                    <IconMinus size={20} />
                                </Button>
                            </Tooltip>
                        </Box>
                        <Box
                            ref={svgContainerRef}
                            sx={{
                                flexGrow: 1,
                                border: '1px solid #ccc',
                                overflow: 'auto',
                                cursor: isPanning ? 'grabbing' : (activeTool === 'addNode' ? 'crosshair' : (activeTool === 'select' ? 'default' : (activeTool === 'rotate-drag' ? 'grab' : (activeTool === 'edit' ? 'text' : (activeTool === 'delete' ? 'not-allowed' : (activeTool === 'addEdge' ? 'crosshair' : 'auto')))))),
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
                                width={viewBox.width * scale}
                                height={viewBox.height * scale}
                                viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`}
                                preserveAspectRatio="xMidYMid meet"
                                style={{ display: 'block', width: "100%" }}
                            >
                                <defs>
                                    <marker id="arrowhead-yeni-yg" markerWidth="10" markerHeight="7" refX="0" refY="3.5" orient="auto">
                                        <polygon points="0 0, 10 3.5, 0 7" fill={linkColors['Yeni YG']} />
                                    </marker>
                                    <marker id="arrowhead-yeni-ag" markerWidth="10" markerHeight="7" refX="0" refY="3.5" orient="auto">
                                        <polygon points="0 0, 10 3.5, 0 7" fill={linkColors['Yeni AG']} />
                                    </marker>
                                    <marker id="arrowhead-dmm-yg" markerWidth="10" markerHeight="7" refX="0" refY="3.5" orient="auto">
                                        <polygon points="0 0, 10 3.5, 0 7" fill={linkColors['DMM YG']} />
                                    </marker>
                                    <marker id="arrowhead-dmm-ag" markerWidth="10" markerHeight="7" refX="0" refY="3.5" orient="auto">
                                        <polygon points="0 0, 10 3.5, 0 7" fill={linkColors['DMM AG']} />
                                    </marker>
                                    <marker id="arrowhead-tr-connection" markerWidth="10" markerHeight="7" refX="0" refY="3.5" orient="auto">
                                        <polygon points="0 0, 10 3.5, 0 7" fill={linkColors['TR-Connection']} />
                                    </marker>
                                </defs>
                                <g transform={`rotate(${rotationAngle} ${rotateOriginX} ${rotateOriginY})`}>
                                    {mapEdges.map((edge) => (
                                        <g key={edge.id}>
                                            <line
                                                id={edge.id}
                                                x1={edge.fromX}
                                                y1={edge.fromY}
                                                x2={edge.toX}
                                                y2={edge.toY}
                                                stroke={linkColors[edge.miktarTipi as keyof typeof linkColors] || 'gray'}
                                                strokeWidth={selectedEdgeIds.has(edge.id) ? 4 / scale : 2 / scale}
                                                markerEnd={edge.miktarTipi !== 'TR-Connection' ? `url(#arrowhead-${edge.miktarTipi.toLowerCase().replace(/ /g, '-')})` : undefined}
                                                style={{ cursor: activeTool === 'select' || activeTool === 'edit' || activeTool === 'delete' ? 'pointer' : 'auto' }}
                                                onClick={(e) => handleEdgeClick(edge, e as React.MouseEvent<SVGLineElement>)}
                                            />
                                            {editingEdgeId === edge.id ? (
                                                <foreignObject
                                                    x={(edge.fromX + edge.toX) / 2 - 30}
                                                    y={(edge.fromY + edge.toY) / 2 - 15}
                                                    width="60"
                                                    height="25"
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
                                                            width: '100%',
                                                            height: '100%',
                                                            boxSizing: 'border-box',
                                                            textAlign: 'center',
                                                            fontSize: `${10 / scale}px`,
                                                            background: theme.palette.background.paper,
                                                            color: textColor,
                                                            border: `1px solid ${theme.palette.primary.main}`,
                                                            borderRadius: '0px',
                                                            padding: '2px'
                                                        }}
                                                    />
                                                </foreignObject>
                                            ) : (
                                                <text
                                                    x={(edge.fromX + edge.toX) / 2}
                                                    y={(edge.fromY + edge.toY) / 2 - (5 / scale)}
                                                    fontSize={`${10 / scale}px`}
                                                    fill={textColor}
                                                    textAnchor="middle"
                                                    style={{
                                                        textShadow: `1px 1px 2px ${theme.palette.background.default}`,
                                                        pointerEvents: activeTool === 'edit' ? 'auto' : 'none',
                                                        cursor: activeTool === 'edit' ? 'text' : 'auto'
                                                    }}
                                                    onClick={(e) => handleTextClick(edge.id, 'edge', String(edge.distance), e as React.MouseEvent<SVGTextElement>)}
                                                >
                                                    {`${edge.distance}m`}
                                                </text>
                                            )}
                                        </g>
                                    ))}
                                    {renderHubNode()}
                                    {mapNodes.filter(node => !node.isHub).map((node) => (
                                        <g key={node.id}>
                                            <circle
                                                id={node.id}
                                                cx={node.x || 0}
                                                cy={node.y || 0}
                                                r={
                                                    activeTool === 'addEdge' ? (12 / scale) :
                                                        selectedNodeIds.has(node.id) ? 10 / scale : 8 / scale
                                                }
                                                fill={node.isNew ? theme.palette.warning.main : theme.palette.error.main}
                                                stroke={selectedNodeIds.has(node.id) ? theme.palette.primary.dark : theme.palette.text.primary}
                                                strokeWidth={selectedNodeIds.has(node.id) ? 3 / scale : 1 / scale}
                                                className={node.isNew ? "blink-node" : ""}
                                                style={{ cursor: activeTool === 'select' || activeTool === 'edit' || activeTool === 'delete' ? 'pointer' : (activeTool === 'addEdge' ? 'crosshair' : 'auto') }}
                                                onClick={(e) => handleNodeClick(node, e as React.MouseEvent<SVGCircleElement>)}
                                            />
                                            {editingNodeId === node.id ? (
                                                <foreignObject
                                                    x={(node.x || 0) - 50}
                                                    y={(node.y || 0) + (12 / scale)}
                                                    width="100"
                                                    height="25"
                                                >
                                                    <input
                                                        ref={inputRef}
                                                        type="text"
                                                        value={editValue}
                                                        onChange={handleNodeNameChange}
                                                        onBlur={handleNodeNameBlur}
                                                        onKeyDown={handleNodeNameKeyDown}
                                                        onMouseDown={(e) => e.stopPropagation()}
                                                        onClick={(e) => e.stopPropagation()}
                                                        autoFocus
                                                        style={{
                                                            width: '100%',
                                                            height: '100%',
                                                            boxSizing: 'border-box',
                                                            textAlign: 'center',
                                                            fontSize: `${10 / scale}px`,
                                                            background: theme.palette.background.paper,
                                                            color: textColor,
                                                            border: `1px solid ${theme.palette.primary.main}`,
                                                            borderRadius: '0px',
                                                            padding: '2px'
                                                        }}
                                                    />
                                                </foreignObject>
                                            ) : (
                                                <text
                                                    x={node.x || 0}
                                                    y={(node.y || 0) - (15 / scale)}
                                                    fontSize={`${10 / scale}px`}
                                                    fill={textColor}
                                                    textAnchor="middle"
                                                    style={{
                                                        textShadow: `1px 1px 2px ${theme.palette.background.default}`,
                                                        pointerEvents: activeTool === 'edit' ? 'auto' : 'none',
                                                        cursor: activeTool === 'edit' ? 'text' : 'auto'
                                                    }}
                                                    onClick={(e) => handleTextClick(node.id, 'node', node.name, e as React.MouseEvent<SVGTextElement>)}
                                                >
                                                    {node.name}
                                                </text>
                                            )}
                                        </g>
                                    ))}
                                    {drawingEdgeStartNode && activeTool === 'addEdge' && (
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
                        <Box sx={{ width: '200px', borderLeft: '1px solid #eee', p: 2, display: 'flex', flexDirection: 'column', gap: 2, borderRadius: 0 }}>
                            <Typography variant="h6" sx={{ mb: 1 }}>Harita Kılavuzu</Typography>
                            <Stack spacing={1}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <Box sx={{ width: 16, height: 16, bgcolor: theme.palette.primary.main, clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)' }} />
                                    <Typography variant="body2">Merkez Düğüm</Typography>
                                </Box>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <Box sx={{ width: 16, height: 16, borderRadius: '50%', bgcolor: theme.palette.error.main }} />
                                    <Typography variant="body2">Düğüm (Ürün Tipi)</Typography>
                                </Box>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <Box sx={{ width: 24, height: 2, bgcolor: linkColors['Yeni YG'] }} />
                                    <Typography variant="body2">Yeni YG Bağlantısı</Typography>
                                </Box>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <Box sx={{ width: 24, height: 2, bgcolor: linkColors['Yeni AG'] }} />
                                    <Typography variant="body2">Yeni AG Bağlantısı</Typography>
                                </Box>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <Box sx={{ width: 24, height: 2, bgcolor: linkColors['DMM YG'] }} />
                                    <Typography variant="body2">DMM YG Bağlantısı</Typography>
                                </Box>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <Box sx={{ width: 24, height: 2, bgcolor: linkColors['DMM AG'] }} />
                                    <Typography variant="body2">DMM AG Bağlantısı</Typography>
                                </Box>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <Box sx={{ width: 24, height: 2, bgcolor: linkColors['TR-Connection'] }} />
                                    <Typography variant="body2">TR-Connection Bağlantısı</Typography>
                                </Box>
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
                <Button onClick={onClose} color="primary" variant="outlined" sx={{ borderRadius: 0 }}>
                    Kapat
                </Button>
                <Button onClick={handleSaveChanges} color="primary" variant="contained" sx={{ borderRadius: 0 }}>
                    Değişiklikleri Kaydet
                </Button>
                <Button onClick={() => handleDownload('png')} color="secondary" variant="contained" sx={{ borderRadius: 0 }}>
                    PNG İndir
                </Button>
                <Button onClick={() => handleDownload('pdf')} color="secondary" variant="contained" sx={{ borderRadius: 0 }}>
                    PDF İndir
                </Button>
            </DialogActions>
            <style>
                {`
                    @keyframes blink {
                        0% { opacity: 1; }
                        50% { opacity: 0.5; }
                        100% { opacity: 1; }
                    }
                    .blink-node {
                        animation: blink 1s infinite;
                    }
                `}
            </style>
        </Dialog>
    );
};

export default MapPreviewModal;