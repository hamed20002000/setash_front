import * as d3 from 'd3-force';

export interface MapNode extends d3.SimulationNodeDatum {
    id: string;
    name: string;
    x: number | undefined; // ✅ x و y می‌توانند undefined باشند
    y: number | undefined; // ✅ از این جهت که در ابتدا مقداری ندارند
    fx?: number | null;     // ✅ خصوصیت fx و fy را اضافه کنید
    fy?: number | null;     // ✅ اینها برای fix کردن موقعیت گره در D3 استفاده می‌شوند
    isHub?: boolean;
    isNew?: boolean;
    channelRowId?: string;
}

export interface SelectOption {
    id: string;
    name: string;
    weight?: number | null;
    // ✅ Change this line to be more specific
    unit?: {
        id: string;
        title: string;
        recordStatus?: number;
        createAt?: string;
    };
    productTypeId?: string;
    label?: string;
    parent?: { id: string; label: string } | null;
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


export interface ProductTypesType {
    id: string; // یا number، بستگی به API دارد
    name: string;
    recordStatus: number;
    createAt: string;
    type: number;
    status: string;
}