// src/views/project/transmissions/types.ts
import * as d3 from 'd3-force';

export interface MapNode extends d3.SimulationNodeDatum {
    id: string;
    name: string;
    x: number | undefined;
    y: number | undefined;
    fx?: number | null;
    fy?: number | null;
    isHub?: boolean;
    isNew?: boolean;
    channelRowId?: string;


    productTypeCategory?: 1 | 2;
    groupId?: string;
}
export type NodeStatus = 0 | 1 | 2; // اگر نداری اضافه کن (0=YENİ, 1=DMM, 2=MEVCUT)

export interface SelectOption {
    id: string;
    name: string;
    weight?: number | null;
    unit?: {
        id: string;
        title: string;
        recordStatus?: number;
        createAt?: string;
    };
    productTypeId?: string;
    label?: string;
    parent?: { id: string; label: string } | null;
    type?: number;
    productStatus?: NodeStatus;
    groupId?: string;

}

export interface AddedItem {
    id: string;
    name: string;
    quantity: number;
    miktarTipi: 'Yeni YG' | 'Yeni AG' | 'DMM YG' | 'DMM AG';
    weight?: number | null;
    unit?: {
        id: string;
        title: string;
        recordStatus: number;
        createAt: string;
    };
}

export type ValidMiktarTipi = 'Yeni YG' | 'Yeni AG' | 'DMM YG' | 'DMM AG';
export type FullMiktarTipi = ValidMiktarTipi | 'TR-Connection';

export interface TransmissionRow {
    id: string;
    fromProductType: string;
    toProductType: string;
    distance: number;
    miktarTipi: FullMiktarTipi;
    network: string;
    formulaTitle: string;
    createAt?: string;
    recordStatus?: number;
    fromProductTypeId?: string;
    toProductTypeId?: string;
    networkId?: string;
    fromProductTypeX?: number;
    fromProductTypeY?: number;
    toProductTypeX?: number;
    toProductTypeY?: number;
    items?: AddedItem[];
    fromProductTypeCategory?: 1 | 2;
    toProductTypeCategory?: 1 | 2;
}

export type MiktarTipi = 'Yeni YG' | 'Yeni AG' | 'DMM YG' | 'DMM AG' | 'TR-Connection';

export interface D3MapLink extends d3.SimulationLinkDatum<MapNode> {
    id: string;
    distance: number;
    miktarTipi: MiktarTipi;
    formulaTitle?: string;
    items?: AddedItem[];
}

export interface ItemType {
    id: string;
    name: string;
    description: string;
    abbreviation: string;
    recordStatus: number;
    createAt: string;
    weight: number | null;
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
    status: 'Aktif' | 'Pasif' | 'Silindi';
}

export interface MapEdge {
    id: string;
    fromNodeId: string;
    toNodeId: string;
    fromX: number;
    fromY: number;
    toX: number;
    toY: number;
    distance: number;
    miktarTipi: MiktarTipi;
    formulaTitle?: string;
    items?: AddedItem[];
}


// Corrected ProductTypesType interface
export interface ProductTypesType {
    id: string;
    name: string;
    recordStatus: number;
    createAt: string;
    type: number;
    status?: string;
    // The missing property is added here
    parentProductType?: {
        id: string;
        name: string;
    } | null;
}