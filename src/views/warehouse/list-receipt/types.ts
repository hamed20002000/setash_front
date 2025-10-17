// src/views/Warehouse/types.ts

export interface WarehouseType {
    id: number;
    name: string;
    recordStatus: number;
    description: string;
    status: string;
    createAt: string;
}

export interface UnitType {
    id: string;
    title: string;
    recordStatus: number;
    createAt: string;
}

export interface ItemType {
    id: string;
    name: string;
    abbreviation: string;
    recordStatus: number;
    unit: UnitType;
}

export interface ProviderType {
    id: number;
    name: string;
    address: string;
    phone: string;
    createAt: string;
    recordStatus: number;
    firm: boolean;
}

export interface OrderDetailType {
    id: string;
    quantity: string;
    price: string | null;
    createAt: string;
    recordStatus: number;
    description: string;
}

// export interface InvoiceDetailType {
//     id: string;
//     quantity: string;
//     price: string;
//     totalPrice: string;
//     discountPercent: string;
//     discountAmount: string;
//     totalDiscount: string;
//     totalNetPrice: string;
//     createAt: string;
//     recordStatus: number;
//     description: string;
//     firm: boolean | null;
//     invoiceHeader: InvoiceHeaderType;
// }

export interface InvoiceDetailType {
    id: string;
    quantity: string;
    price: string;
    totalPrice: string;
    discountPercent: string;
    discountAmount: string;
    totalDiscount: string;
    totalNetPrice: string;
    createAt: string;
    recordStatus: number;
    description: string;
    firm: boolean | null;
    item: ItemType; // اضافه شده
    orderDetail?: OrderDetailType;
    invoiceHeader: InvoiceHeaderType;
    provider?: ProviderType; // اضافه شده
}

export interface InvoiceHeaderType {
    id: number;
    invoiceNo: string;
    docDate: string;
    totalPrice: string;
    totalNetPrice: string;
    totalDiscount: string;
    createAt: string;
    recordStatus: number;
    description: string | null;
    status: number;
    statusDescription: string | null;
    provider?: ProviderType;
}
export interface LocationLite {
    id: number | string;
    name: string;
    code?: string;
    address?: string;
    createAt?: string;
    recordStatus?: number;
}
export interface InvoiceType {
    id: number;
    invoiceNo: string;
    docDate: string;
    recordStatus: number;
    invoiceDetails: InvoiceDetailType[];
    status: number;
    provider?: ProviderType;

    warehouse: LocationLite | null;
    workhouse: LocationLite | null;

}

// **تغییرات در اینترفیس‌های زیر اعمال شده است**
// export interface ReceiptItem {
//     id: string;
//     quantity: string;
//     createAt: string;
//     recordStatus: number;
//     firm: boolean;
//     description: string;
//     item: ItemType;
//     invoiceDetail: InvoiceDetailType;
//     provider: ProviderType; // 👈 اضافه شده
//     orderDetail?: OrderDetailType; // 👈 اضافه شده
// }

export interface ReceiptItem {
    id: string;
    quantity: string;
    createAt: string;
    recordStatus: number;
    firm: boolean;
    description: string;
    item: ItemType;
    invoiceDetail: InvoiceDetailType;
    provider?: ProviderType; // 👈 تغییر یافته به اختیاری
    orderDetail?: OrderDetailType; // 👈 اضافه شده و اختیاری
}

export interface ProcessedReceiptItem {
    id: number;
    item: string;
    itemName: string;
    invoiceNo: string;
    unit?: UnitType;
    quantity: number;
    description: string;
    invoiceDetailId: number;
    providerId: number;
    providerName: string;
    firm: boolean;
    recordStatus?: number;
    isDeleted?: boolean;
    orderDetail?: OrderDetailType; // 👈 اضافه شده
}

export interface ReceiptType {
    id: number;
    code: string;
    docDate: string;
    warehouseId: number;
    recordStatus: number;
    createAt: string;
    isEnd: boolean | null;
    receiptDetails: ReceiptItem[];
    warehouse: WarehouseType;
}

export interface ReceiptItemsTableProps {
    items: ProcessedReceiptItem[];
    deletedItems: ProcessedReceiptItem[];
    onItemsUpdate: (items: ProcessedReceiptItem[]) => void;
    onItemDelete: (item: ProcessedReceiptItem) => void;
    onRestoreItem: (id: number) => void;
    showAlert: (message: string, severity: 'success' | 'error' | 'warning' | 'info') => void;
    onInvoiceSelect: (invoice: InvoiceType | null) => void;
    endedInvoiceIds: number[];
    getReceipts: () => Promise<void>;
    endedInvoiceReceiptMap: Record<number, number>;
    isInvoiceComboDisabled: boolean;
}