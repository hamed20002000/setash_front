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
}

export interface SelectOption {
    id: string;
    productTypeId: string;
    name: string;
    label: string;
    parent: { id: string, label: string } | null;
    weight?: number | null;
    unit?: {
        id: string;
        title: string;
        recordStatus: number;
        createAt: string;
    };
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

export interface TransmissionRow {
    id: string;
    fromProductType: string;
    toProductType: string;
    distance: number;
    miktarTipi: 'Yeni YG' | 'Yeni AG' | 'DMM YG' | 'DMM AG';
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