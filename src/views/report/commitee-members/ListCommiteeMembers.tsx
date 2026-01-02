import React, { useEffect, useState, useRef, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
    TableContainer, Table, TableHead, TableRow, TableBody,
    Typography, Chip, Menu, IconButton, ListItemIcon, Box,
    TableCell as MuiTableCell,
    MenuItem as MuiMenuItem,
    Stack, Grid, Button, Alert, TablePagination, TextField, InputAdornment,
    ToggleButtonGroup, ToggleButton as MuiToggleButton,
    TableSortLabel, Dialog, DialogTitle, DialogContent, DialogActions,
    CircularProgress, FormControl, RadioGroup, FormControlLabel, Radio,
} from '@mui/material';

import { keyframes, styled } from '@mui/material/styles';
import BlankCard from '../../../components/shared/BlankCard';
import CustomFormLabel from '../../../components/forms/theme-elements/CustomFormLabel';
import CustomTextField from '../../../components/forms/theme-elements/CustomTextField';
import { IconDots, IconEdit, IconTrash, IconSearch, IconFileDownload, IconX }
    from '@tabler/icons-react';
import DoNotDisturbOnRoundedIcon from '@mui/icons-material/DoNotDisturbOnRounded';
import DoneRoundedIcon from '@mui/icons-material/DoneRounded';
import DeleteCommiteeMembers from './DeleteCommiteeMembers';
import axios from 'axios';
import server from '../../../assets/address.json';
import { useTooltip, CustomTooltip } from 'src/context/TooltipContext';

import { tr } from 'date-fns/locale';
import { format } from 'date-fns';

import { useAuth } from 'src/context/AuthContext';
// Importations for reporting
import jsPDF from 'jspdf';
// @ts-ignore
import { autoTable } from 'jspdf-autotable';
import { NotoSansRegular } from 'src/assets/fonts/NotoSans-Regular';
import { TimesNewRoman } from 'src/assets/fonts/Times';
import { ArialFont } from 'src/assets/fonts/Arial';
import Logo from 'src/assets/images/logos/logo.png';
import Excel from 'exceljs';
import { saveAs } from 'file-saver';


// --- Enums and Utility Types (POZISYON GÜNCEL) ---

/**
 * @description Komite Üyesi Pozisyonları
 */
export enum CommiteMemberPosition {
    Baskan = 0, // رئیس
    Uye = 1     // عضو
}

/**
 * @description Pozisyon ID'sine göre metin döndürür
 * @param position 
 */
const getPositionText = (position: CommiteMemberPosition | number | string): string => {
    const posId = Number(position);
    switch (posId) {
        case CommiteMemberPosition.Baskan: return 'Başkan';
        case CommiteMemberPosition.Uye: return 'Üye';
        default: return 'Bilinmiyor';
    }
};

const PositionStatus = {
    Active: 0,
    Inactive: 1,
    Deleted: 2,
    Text: (status: number) => {
        switch (status) {
            case 0: return 'Aktif';
            case 1: return 'Pasif';
            case 2: return 'Silindi';
            default: return 'Bilinmiyor';
        }
    }
};

const formatDateDisplay = (dateString: string | null): string => {
    if (!dateString) return "N/A";
    try {
        const date = new Date(dateString);
        return format(date, 'dd MMMM yyyy', { locale: tr });
    } catch (e) {
        return "Geçersiz Tarih";
    }
};

interface CommiteeMemberType {
    id: number;
    name: string;
    family: string;
    positionId: CommiteMemberPosition;
    positionTitle: string;
    createAt: string;
    recordStatus?: number;
    status: string;
}

const MOCK_MEMBERS: CommiteeMemberType[] = [];
// ------------------------------------

// --- Styled Components (UNCHANGED) ---
const blinkAnimation = keyframes`
    0% { transform: scale(1); box-shadow: 0 0 0px 0px rgba(103, 58, 183, 0.7); }
    50% { transform: scale(1.05); box-shadow: 0 0 10px 5px rgba(103, 58, 183, 0.7); }
    100% { transform: scale(1); box-shadow: 0 0 0px 0px rgba(103, 58, 183, 0.7); }
`;
const BlinkingButton = styled(Button)<{ isBlinking: boolean }>(({ isBlinking }) => ({
    animation: isBlinking ? `${blinkAnimation} 1.5s infinite` : 'none',
    transition: 'transform 0.3s ease-in-out',
}));

const StyledToggleButton = styled(MuiToggleButton)(({ theme, value, selected }) => ({
    '&.Mui-selected': {
        color: 'white',
        ...(value === 'all' && selected && {
            backgroundColor: theme.palette.primary.main,
            '&:hover': { backgroundColor: theme.palette.primary.dark },
        }),
        ...(value === 'active' && selected && {
            backgroundColor: theme.palette.success.main,
            '&:hover': { backgroundColor: theme.palette.success.dark },
        }),
        ...(value === 'inactive' && selected && {
            backgroundColor: theme.palette.error.main,
            '&:hover': { backgroundColor: theme.palette.error.dark },
        }),
    },
    '&:not(.Mui-selected)': {
        color: theme.palette.text.primary,
        borderColor: theme.palette.divider,
        '&:hover': { backgroundColor: theme.palette.action.hover },
    },
}));

const StyledTableCell = styled(MuiTableCell)(({ theme }) => ({
    fontFamily: 'NotoSans',
    fontSize: '0.8rem',
    [theme.breakpoints.up('md')]: {
        fontSize: '1rem',
    },
}));
// ------------------------------------


// --- Sorting and Filtering Logic (UNCHANGED) ---
const descendingComparator = <T, Key extends keyof T>(
    a: T,
    b: T,
    orderBy: Key,
): number => {
    const valA = a[orderBy];
    const valB = b[orderBy];

    if (valB === undefined || valB === null) {
        return valA === undefined || valA === null ? 0 : -1;
    }
    if (valA === undefined || valA === null) {
        return 1;
    }

    if (typeof valB === 'string' && typeof valA === 'string') {
        return valB.localeCompare(valA);
    }
    if (typeof valB === 'number' && typeof valA === 'number') {
        return valB - valA;
    }
    if (String(valB) < String(valA)) {
        return -1;
    }
    if (String(valB) > String(valA)) {
        return 1;
    }
    return 0;
};

const getComparator = <Key extends keyof CommiteeMemberType>(
    order: 'asc' | 'desc',
    orderBy: Key,
): (a: CommiteeMemberType, b: CommiteeMemberType) => number => {
    return order === 'desc'
        ? (a, b) => descendingComparator(a, b, orderBy)
        : (a, b) => -descendingComparator(a, b, orderBy);
};

const stableSort = <T,>(array: T[], comparator: (a: T, b: T) => number) => {
    const stabilizedThis = array.map((el, index) => [el, index] as [T, number]);
    stabilizedThis.sort((a, b) => {
        const order = comparator(a[0], b[0]);
        if (order !== 0) return order;
        return a[1] - b[1];
    });
    return stabilizedThis.map((el) => el[0]);
};
// ------------------------------------


const ListCommiteeMembers = () => {
    const navigate = useNavigate();

    // --- State Management ---
    const [name, setName] = useState<string>('');
    const [family, setFamily] = useState<string>('');
    const [selectedPositionId, setSelectedPositionId] = useState<CommiteMemberPosition | ''>('');
    const [membersList, setMembersList] = useState<CommiteeMemberType[]>(MOCK_MEMBERS);

    const [editingId, setEditingId] = useState<number | null>(null);
    const [originalName, setOriginalName] = useState<string>('');
    const [originalFamily, setOriginalFamily] = useState<string>('');
    const [originalPositionId, setOriginalPositionId] = useState<CommiteMemberPosition | ''>('');

    // --- Validation States ---
    const [nameError, setNameError] = useState<boolean>(false);
    const [nameHelperText, setNameHelperText] = useState<string>('');
    const [familyError, setFamilyError] = useState<boolean>(false);
    const [familyHelperText, setFamilyHelperText] = useState<string>('');
    const [positionError, setPositionError] = useState<boolean>(false);
    const [positionHelperText, setPositionHelperText] = useState<string>('');

    // --- General & Table States ---
    const [alertMessage, setAlertMessage] = useState<string | null>(null);
    const [alertSeverity, setAlertSeverity] = useState<'success' | 'error' | 'warning' | 'info'>('info');

    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const [selectedRowForMenu, setSelectedRowForMenu] = useState<CommiteeMemberType | null>(null);
    const openMenu = Boolean(anchorEl);

    const [openDeleteModal, setOpenDeleteModal] = useState(false);
    const [memberIdToDelete, setMemberIdToDelete] = useState<number | null>(null);

    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(5);
    const [searchTerm, setSearchTerm] = useState('');

    const [loadingButton, setLoadingButton] = useState<boolean>(false);
    const [loadingData, setLoadingData] = useState<boolean>(true);

    const { isTooltipGloballyEnabled } = useTooltip();

    const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

    const [orderBy, setOrderBy] = useState<keyof CommiteeMemberType>('createAt');
    const [order, setOrder] = useState<'asc' | 'desc'>('desc');

    const nameInputRef = useRef<HTMLInputElement>(null);
    const familyInputRef = useRef<HTMLInputElement>(null);

    const [openDownloadModal, setOpenDownloadModal] = useState(false);
    const [isFormVisible, setIsFormVisible] = useState(false);
    const [isBlinking, setIsBlinking] = useState(true);

    const { allowedOperations } = useAuth();

    // Permission checks (UNCHANGED)
    const hasCreatePermission = useMemo(() => {
        return allowedOperations.some(op => op.systemOperationName === 'Eklemek');
    }, [allowedOperations]);

    const hasEditPermission = useMemo(() => {
        return allowedOperations.some(op => op.systemOperationName === 'Düzenlemek');
    }, [allowedOperations]);

    const hasDeletePermission = useMemo(() => {
        return allowedOperations.some(op => op.systemOperationName === 'Silmek');
    }, [allowedOperations]);

    const hasDownloadPermission = useMemo(() => {
        return allowedOperations.some(op => op.systemOperationName === 'İndirmek ve Yazdırmak');
    }, [allowedOperations]);

    // --- Utility Functions ---

    const showAlert = useCallback((message: string, severity: 'success' | 'error' | 'warning' | 'info') => {
        setAlertMessage(message);
        setAlertSeverity(severity);
    }, []);

    const clearAlert = () => {
        setAlertMessage(null);
    };

    useEffect(() => {
        let timer: NodeJS.Timeout;
        if (alertMessage) {
            timer = setTimeout(() => {
                clearAlert();
            }, 5000);
        }
        return () => {
            clearTimeout(timer);
        };
    }, [alertMessage]);

    const handleApiError = useCallback((e: any) => {
        if (e.response?.status === 401) {
            localStorage.removeItem('authToken');
            showAlert('Oturum süreniz doldu, lütfen tekrar giriş yapın.', 'error');
            navigate("/");
        } else if (e.response?.status === 500) {
            showAlert('Bu kayıt, başka bir işlemde kullanıldığı için silinemez veya düzenlenemez.', 'error');
        } else {
            console.error("API Error:", e);
            showAlert(e.response?.data?.message || 'Bir hata oluştu, lütfen tekrar deneyin.', 'error');
        }
    }, [navigate, showAlert]);

    const resetFormAndState = () => {
        setName('');
        setFamily('');
        setSelectedPositionId('');
        setEditingId(null);
        setOriginalName('');
        setOriginalFamily('');
        setOriginalPositionId('');
        setNameError(false);
        setFamilyError(false);
        setPositionError(false);
        setNameHelperText('');
        setFamilyHelperText('');
        setPositionHelperText('');
        setIsFormVisible(false);
        clearAlert();
    };

    // --- Menu and Delete Modal Handlers ---
    const handleClickMenu = (event: React.MouseEvent<HTMLButtonElement>, row: CommiteeMemberType) => {
        setAnchorEl(event.currentTarget);
        setSelectedRowForMenu(row);
    };

    const handleCloseMenu = () => {
        setAnchorEl(null);
        setSelectedRowForMenu(null);
    };

    const handleClickOpenDeleteModal = () => {
        if (selectedRowForMenu) {
            setMemberIdToDelete(selectedRowForMenu.id);
            setOpenDeleteModal(true);
        }
        handleCloseMenu();
    };

    const handleClickCloseDeleteModal = () => {
        setOpenDeleteModal(false);
        setMemberIdToDelete(null);
        getListCommiteeMembers(); // Refresh list after deletion
    };

    const handleEditClick = () => {
        if (selectedRowForMenu) {
            setName(selectedRowForMenu.name);
            setFamily(selectedRowForMenu.family);
            // Cast to new enum type
            setSelectedPositionId(selectedRowForMenu.positionId as CommiteMemberPosition);

            setOriginalName(selectedRowForMenu.name);
            setOriginalFamily(selectedRowForMenu.family);
            setOriginalPositionId(selectedRowForMenu.positionId as CommiteMemberPosition);

            setEditingId(selectedRowForMenu.id);

            setNameError(false);
            setFamilyError(false);
            setPositionError(false);
            setNameHelperText('');
            setFamilyHelperText('');
            setPositionHelperText('');

            setTimeout(() => {
                nameInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                nameInputRef.current?.focus();
            }, 100);
        }
        handleCloseMenu();
        clearAlert();
        setIsFormVisible(true);
    };

    const handleCancelEdit = () => {
        resetFormAndState();
    };


    // --- CRUD Operations ---

    const validateForm = (): boolean => {
        let isValid = true;

        if (!name.trim()) {
            setNameError(true);
            setNameHelperText('Adı boş olamaz!');
            isValid = false;
        } else {
            setNameError(false);
            setNameHelperText('');
        }

        if (!family.trim()) {
            setFamilyError(true);
            setFamilyHelperText('Soyadı boş olamaz!');
            isValid = false;
        } else {
            setFamilyError(false);
            setFamilyHelperText('');
        }

        // Validate Radio Button selection (0 or 1)
        if (selectedPositionId === '' || isNaN(Number(selectedPositionId))) {
            setPositionError(true);
            setPositionHelperText('Pozisyon seçimi zorunludur!');
            isValid = false;
        } else {
            setPositionError(false);
            setPositionHelperText('');
        }

        if (!isValid) {
            showAlert('Lütfen zorunlu alanları doldurun.', 'warning');
        }

        return isValid;
    }

    const insertCommiteeMember = async () => {
        if (!validateForm()) return;
        clearAlert();

        const authToken = localStorage.getItem('authToken');

        if (!authToken) {
            navigate("/");
            return;
        }

        setLoadingButton(true);
        try {
            const response = await axios.post(
                server.baseurl + server.report + "create-commitee-member",
                {
                    name: name,
                    family: family,
                    position: Number(selectedPositionId) // Send ID (0 or 1)
                },
                {
                    headers: {
                        "Accept": "application/json",
                        'Content-Type': 'application/json',
                        "Authorization": `Bearer ${authToken}`
                    }
                }
            );
            if (response.data.httpStatusCode === 201) {
                showAlert('Yeni Komite Üyesi başarıyla eklendi!', 'success');
                resetFormAndState();
                getListCommiteeMembers();
            } else {
                showAlert(response.data.message || 'Yeni Komite Üyesi eklenirken bir hata oluştu.', 'error');
            }
        } catch (e: any) {
            handleApiError(e);
        } finally {
            setLoadingButton(false);
        }
    };

    const editCommiteeMember = async () => {
        if (editingId === null) return;
        if (!validateForm()) return;
        clearAlert();

        const hasChanged = name !== originalName || family !== originalFamily || selectedPositionId !== originalPositionId;

        if (!hasChanged) {
            showAlert('Herhangi bir değişiklik yapmadınız.', 'info');
            resetFormAndState();
            return;
        }

        const authToken = localStorage.getItem('authToken');

        if (!authToken) {
            showAlert('Lütfen giriş yapın.', 'warning');
            navigate("/");
            return;
        }

        setLoadingButton(true);
        try {
            const response = await axios.put(
                server.baseurl + server.report + "update-commitee-member",
                {
                    id: Number(editingId),
                    name: name,
                    family: family,
                    position: Number(selectedPositionId) // Send ID (0 or 1)
                },
                {
                    headers: {
                        "Accept": "application/json",
                        "Authorization": `Bearer ${authToken}`,
                        'Content-Type': 'application/json'
                    }
                }
            );
            if (response.data.httpStatusCode === 200) {
                showAlert('Komite Üyesi başarıyla güncellendi!', 'success');
                // Optimistic UI update
                const newPositionId = Number(selectedPositionId) as CommiteMemberPosition;
                setMembersList(prevList =>
                    prevList.map(member => (member.id === editingId ? {
                        ...member,
                        name: name,
                        family: family,
                        positionId: newPositionId,
                        positionTitle: getPositionText(newPositionId),
                    } : member))
                );
                resetFormAndState();
            } else {
                showAlert(response.data.message || 'Komite Üyesi güncellenirken bir hata oluştu.', 'error');
            }
        } catch (e: any) {
            handleApiError(e);
        } finally {
            setLoadingButton(false);
        }
    }

    const sendStatusUpdate = async (id: number, statusValue: number) => {
        clearAlert();
        const authToken = localStorage.getItem('authToken');

        if (!authToken) {
            showAlert('Lütfen giriş yapın.', 'warning');
            navigate("/");
            return;
        }

        try {
            const response = await axios.put(
                server.baseurl + server.report + "update-commitee-member",
                { id: Number(id), recordStatus: statusValue },
                {
                    headers: {
                        "Accept": "application/json",
                        "Authorization": `Bearer ${authToken}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            if (response.data.httpStatusCode === 200) {
                const statusText = PositionStatus.Text(statusValue);
                showAlert(`Komite Üyesi başarıyla ${statusText} olarak ayarlandı!`, 'success');
                getListCommiteeMembers();
                resetFormAndState();
            } else {
                showAlert(response.data.message || 'Durum güncellenirken bir hata oluştu.', 'error');
            }
        } catch (e: any) {
            handleApiError(e);
        } finally {
            handleCloseMenu();
        }
    };

    const handleSetActive = () => {
        if (selectedRowForMenu) {
            sendStatusUpdate(selectedRowForMenu.id, PositionStatus.Active);
        }
    };

    const handleSetInactive = () => {
        if (selectedRowForMenu) {
            sendStatusUpdate(selectedRowForMenu.id, PositionStatus.Inactive);
        }
    };

    // --- Data Fetching ---

    const getListCommiteeMembers = useCallback(async () => {
        const authToken = localStorage.getItem('authToken');

        setLoadingData(true);
        if (!authToken) {
            navigate("/");
            setLoadingData(false);
            return;
        }

        try {
            const result = await axios.request({
                baseURL: server.baseurl + server.report + "get-all-commitee-members",
                method: "get",
                headers: {
                    "Accept": "application/json",
                    "Authorization": `Bearer ${authToken}`
                }
            });

            if (result.data.httpStatusCode === 200) {
                const rawData = result.data.data as any[];

                const formattedData = rawData.map((item: any) => ({
                    id: item.id,
                    name: item.name,
                    family: item.family,
                    // Assume API returns position ID (0 or 1)
                    positionId: item.position as CommiteMemberPosition,
                    positionTitle: getPositionText(item.position), // Use utility function
                    createAt: item.createAt,
                    recordStatus: item.recordStatus,
                    status: PositionStatus.Text(item.recordStatus),
                }));
                setMembersList(formattedData as CommiteeMemberType[]);
                setLoadingData(false);
            } else {
                showAlert(result.data.message || 'Komite Üyeleri listesi alınırken bir hata oluştu.', 'error');
            }
        } catch (e: any) {
            handleApiError(e);
            setLoadingData(false);
        }
    }, [navigate, showAlert, handleApiError]);


    useEffect(() => {
        getListCommiteeMembers();
    }, [getListCommiteeMembers]);

    useEffect(() => {
        const timer = setTimeout(() => {
            setIsBlinking(false);
        }, 5000);
        return () => {
            clearTimeout(timer);
        };
    }, []);

    // --- Table & Pagination Logic (UNCHANGED) ---
    const handleStatusFilterChange = (
        _event: React.MouseEvent<HTMLElement>,
        newFilter: 'all' | 'active' | 'inactive' | null,
    ) => {
        if (newFilter !== null) {
            setStatusFilter(newFilter);
            setPage(0);
        }
    };

    const handleChangePage = (
        _event: unknown,
        newPage: number) => {
        setPage(newPage);
    };

    const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
        setRowsPerPage(parseInt(event.target.value, 10));
        setPage(0);
    };

    const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setSearchTerm(event.target.value);
        setPage(0);
    };

    const handleRequestSort = (property: keyof CommiteeMemberType) => {
        const isAsc = orderBy === property && order === 'asc';
        setOrder(isAsc ? 'desc' : 'asc');
        setOrderBy(property);
        setPage(0);
    };

    const filteredMembers = membersList.filter(member => {
        const matchesSearch = member.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            member.family.toLowerCase().includes(searchTerm.toLowerCase()) ||
            member.positionTitle.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesStatus =
            statusFilter === 'all' ||
            (statusFilter === 'active' && member.recordStatus === PositionStatus.Active) ||
            (statusFilter === 'inactive' && member.recordStatus === PositionStatus.Inactive);
        return matchesSearch && matchesStatus;
    });

    const sortedAndFilteredMembers = stableSort(filteredMembers, getComparator(order, orderBy));

    const paginatedMembers = sortedAndFilteredMembers.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

    // --- Reporting Functions (UNCHANGED) ---

    const handleDownloadAllMembersPDF = () => {
        if (!sortedAndFilteredMembers || sortedAndFilteredMembers.length === 0) {
            showAlert('PDF oluşturulacak Komite Üyesi bulunamadı.', 'warning');
            return;
        }

        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();

        try {
            // ... (Font settings)
            doc.addFileToVFS('NotoSans-Regular.ttf', NotoSansRegular);
            doc.addFont('NotoSans-Regular.ttf', 'NotoSans', 'normal');
            doc.addFileToVFS('Times-New-Roman.ttf', TimesNewRoman);
            doc.addFont('Times-New-Roman.ttf', 'Times', 'normal');
            doc.addFileToVFS('Arial.ttf', ArialFont);
            doc.addFont('Arial.ttf', 'Arial', 'normal');
            doc.setFont('Arial');

            const rows = sortedAndFilteredMembers.map(member => [
                member.name,
                member.family,
                member.positionTitle,
                formatDateDisplay(member.createAt),
                member.status,
            ]);

            autoTable(doc, {
                startY: 65,
                head: [['Adı', 'Soyadı', 'Pozisyon', 'Oluşturulma Tarihi', 'Durum']],
                body: rows,
                theme: 'grid',
                styles: { font: 'Arial', fontStyle: 'normal', fontSize: 8, cellPadding: 2, overflow: 'linebreak' },
                headStyles: { fillColor: [242, 242, 242], textColor: [0, 0, 0], font: 'Arial', fontSize: 9 },
                didDrawPage: () => {
                    doc.setFont('Arial', 'bold');
                    doc.setFontSize(14);
                    doc.text('Tüm Komite Üyeleri Raporu', pageWidth / 2, 15, { align: 'center' });


                    doc.addImage(Logo, 'PNG', pageWidth - 50, 10, 35, 18);

                    doc.setFontSize(10);
                    doc.setFont('NotoSans', 'bold');
                    doc.text(`Rapor Tarihi:`, 15, 40);
                    doc.setFont('NotoSans', 'normal');
                    doc.text(`${formatDateDisplay(new Date().toISOString())}`, 40, 40);


                    doc.setLineWidth(0.5);
                    doc.line(15, 48, pageWidth - 15, 48);

                    doc.setFont('NotoSans', 'normal');
                    doc.setFontSize(8);
                    doc.setTextColor(0);
                    const companyInfo = [
                        'SETAŞ SİSTEM BİLİŞİM İNŞAAT TAAHHÜT TİCARET LTD. ŞTİ.',
                        'Mansuroğlu Mh. 283/6 Sk. No: 2 Bayraklı - İZMİR Tel: +90 (232) 347 74 74 pbx Fax: +90 (232) 347 77 11',
                        'http://www.setasbilisim.com.tr e-mail:setas@setasbilisim.com.tr'
                    ];
                    let footerY = pageHeight - 20;
                    companyInfo.forEach(line => {
                        doc.text(line, pageWidth / 2, footerY, { align: 'center' });
                        footerY += 4;
                    });

                    doc.setTextColor(0);
                    doc.setFontSize(10);
                    doc.text('İmza', pageWidth - 20, pageHeight - 12, { align: 'right' });
                    doc.line(pageWidth - 60, pageHeight - 10, pageWidth - 10, pageHeight - 10);

                    const pageNumber = (doc as any).internal.getCurrentPageInfo().pageNumber;
                    const pageCount = (doc as any).internal.getNumberOfPages();
                    doc.text(`Sayfa ${pageNumber} / ${pageCount}`, 15, pageHeight - 10);
                },
                showHead: 'everyPage',
                margin: { top: 50, bottom: 45 },
            });

            doc.save('Tüm_Komite_Üyeleri_Raporu.pdf');
            showAlert('PDF başarıyla oluşturuldu ve indiriliyor.', 'success');
        } catch (error: any) {
            console.error('PDF oluşturulurken hata:', error);
            showAlert('PDF oluşturulurken bir hata oluştu: ' + error.message, 'error');
        }
    };


    const handleExportExcel = async () => {
        setOpenDownloadModal(false);
        if (!sortedAndFilteredMembers || sortedAndFilteredMembers.length === 0) {
            showAlert('Dışa aktarılacak Komite Üyesi bulunamadı.', 'warning');
            return;
        }

        showAlert('Excel dosyası oluşturuluyor...', 'info');

        try {
            const workbook = new Excel.Workbook();
            const worksheet = workbook.addWorksheet('Komite Üyeleri Raporu', { views: [{ rightToLeft: false }] });

            const thinBorder = { style: 'thin', color: { argb: 'FFD3D3D3' } };
            const border = { top: thinBorder, left: thinBorder, bottom: thinBorder, right: thinBorder };
            const headerFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E1F2' } };
            const font = { name: 'Calibri', size: 11, bold: false, color: { argb: 'FF000000' } };
            const headerFont = { ...font, bold: true };
            const centerAlignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
            const leftAlignment = { vertical: 'middle', horizontal: 'left', wrapText: true };

            const fullHeaderStyle = {
                border: border,
                alignment: centerAlignment,
                font: headerFont,
                fill: headerFill
            } as Partial<Excel.Style>;

            const bodyStyle = {
                border: border,
                alignment: leftAlignment,
                font: font
            } as Partial<Excel.Style>;

            const addCompanyInfo = (ws: Excel.Worksheet) => {
                ws.addRow([]);
                const companyInfo = [
                    'SETAŞ SİSTEM BİLİŞİM İNŞAAT TAAHHÜT TİCARET LTD. ŞTİ.',
                    'Mansuroğlu Mh. 283/6 Sk. No: 2 Bayraklı - İZMİR Tel: +90 (232) 347 74 74 pbx Fax: +90 (232) 347 77 11',
                    'http://www.setasbilisim.com.tr e-mail:setas@setasbilisim.com.tr',
                ];
                companyInfo.forEach(line => {
                    ws.addRow([line]);
                    const lastRow = ws.lastRow;
                    if (lastRow) {
                        lastRow.getCell(1).alignment = { horizontal: 'center' };
                        lastRow.getCell(1).font = { name: 'Arial', size: 8, bold: false };
                        ws.mergeCells(`A${lastRow.number}:E${lastRow.number}`);
                    }
                });
            };

            worksheet.addRow(['', '', '', '', '']);
            const titleRow = worksheet.addRow(['Tüm Komite Üyeleri Raporu']);
            if (titleRow) {
                titleRow.font = { name: 'Times New Roman', size: 12, bold: true };
                titleRow.getCell(1).alignment = { horizontal: 'center' };
            }
            worksheet.mergeCells('A2:E2');

            worksheet.addRow([`Tarih: ${formatDateDisplay(new Date().toISOString())}`]);
            const dateRow = worksheet.lastRow;
            if (dateRow) {
                dateRow.getCell(1).font = { name: 'Times New Roman', size: 10, bold: false };
                dateRow.getCell(1).alignment = { horizontal: 'left' };
            }
            worksheet.addRow([]);

            const tableHeaders = ['Adı', 'Soyadı', 'Pozisyon', 'Oluşturulma Tarihi', 'Durum'];
            const headerRow = worksheet.addRow(tableHeaders);
            headerRow.eachCell((cell) => {
                cell.style = fullHeaderStyle;
            });

            sortedAndFilteredMembers.forEach(member => {
                const row = worksheet.addRow([
                    member.name,
                    member.family,
                    member.positionTitle,
                    formatDateDisplay(member.createAt),
                    member.status
                ]);
                row.eachCell((cell) => {
                    cell.style = bodyStyle;
                });
            });

            addCompanyInfo(worksheet);

            worksheet.columns.forEach((column) => {
                let maxLength = 0;
                if (column.eachCell) {
                    column.eachCell({ includeEmpty: true }, (cell) => {
                        const columnLength = cell.value ? cell.value.toString().length : 10;
                        if (columnLength > maxLength) {
                            maxLength = columnLength;
                        }
                    });
                }
                column.width = Math.min(Math.max(maxLength + 2, 12), 50);
            });

            const buffer = await workbook.xlsx.writeBuffer();
            const fileName = `Tüm_Komite_Üyeleri_Raporu_${new Date().toLocaleDateString('tr-TR')}.xlsx`;
            saveAs(new Blob([buffer]), fileName);

            showAlert('Excel başarıyla oluşturuldu ve indiriliyor.', 'success');
        } catch (error) {
            console.error("Excel dışa aktarılırken hata:", error);
            showAlert('Excel dışa aktarılırken bir hata oluştu. Lütfen konsolu kontrol edin.', 'error');
        }
    };

    // --- JSX Render ---
    return (
        <>
            <div style={{
                borderBottom: "1px solid",
                margin: "10px 0 30px 0",
                padding: "10px 15px 30px 15px"
            }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" mt={2} mb={3} flexWrap="wrap" gap={2}>

                    <Typography variant="h5" mb={2}>{editingId ? 'Komite Üyesi Düzenle' : 'Yeni Komite Üyesi Kaydı'}</Typography>
                    <Stack
                        direction={{ xs: 'column', sm: 'row' }}
                        spacing={1}
                        alignItems="stretch"
                        flexGrow={1}
                        justifyContent={{ xs: 'flex-start', sm: 'flex-end' }}
                    >
                        {!isFormVisible && hasCreatePermission && (
                            <CustomTooltip title={isTooltipGloballyEnabled ? "Yeni bir Komite Üyesi kaydetmek için tıklayınız" : ""}>
                                <BlinkingButton
                                    variant="contained"
                                    color="primary"
                                    onClick={() => setIsFormVisible(true)}
                                    isBlinking={isBlinking}
                                    fullWidth={false}
                                >
                                    Yeni Komite Üyesi Kaydet
                                </BlinkingButton>
                            </CustomTooltip>
                        )}
                        {isFormVisible && (
                            <CustomTooltip title={isTooltipGloballyEnabled ? "Kayıt formunu gizlemek için tıklayınız." : ""}>
                                <Button
                                    variant="contained"
                                    color="error"
                                    onClick={resetFormAndState}
                                    fullWidth={false}
                                    startIcon={<IconX size={20} />}
                                >
                                    Gizle
                                </Button>
                            </CustomTooltip>
                        )}

                    </Stack>

                </Stack>

                {((isFormVisible && hasCreatePermission) || (editingId && hasEditPermission)) && (
                    <Grid container spacing={2}>

                        {/* Fild Adı (Name) */}
                        <Grid item xs={12} sm={6}>
                            <CustomFormLabel htmlFor="member-name" required>Adı</CustomFormLabel>
                            <CustomTextField
                                id="member-name"
                                placeholder="Adı"
                                sx={{ width: '100%' }}
                                size="small"
                                value={name}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                    setName(e.target.value);
                                    if (nameError && e.target.value.trim()) {
                                        setNameError(false);
                                        setNameHelperText('');
                                    }
                                }}
                                inputRef={nameInputRef}
                                error={nameError}
                                helperText={nameHelperText}
                            />
                        </Grid>

                        {/* Fild نام خانوادگی (Family) */}
                        <Grid item xs={12} sm={6}>
                            <CustomFormLabel htmlFor="member-family" required>Soyadı</CustomFormLabel>
                            <CustomTextField
                                id="member-family"
                                placeholder="Soyadı"
                                sx={{ width: '100%' }}
                                size="small"
                                value={family}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                    setFamily(e.target.value);
                                    if (familyError && e.target.value.trim()) {
                                        setFamilyError(false);
                                        setFamilyHelperText('');
                                    }
                                }}
                                inputRef={familyInputRef}
                                error={familyError}
                                helperText={familyHelperText}
                            />
                        </Grid>

                        {/* Fild موقعیت (Position - Radio Buttons) (BAŞKAN VE ÜYE) */}
                        <Grid item xs={12} sm={12}>
                            <CustomFormLabel htmlFor="member-position" required>Pozisyon</CustomFormLabel>
                            <FormControl fullWidth size="small" error={positionError} sx={{ mt: 1 }}>
                                <RadioGroup
                                    row
                                    name="member-position"
                                    aria-label="member position"
                                    value={selectedPositionId}
                                    onChange={(e) => {
                                        const newValue = Number(e.target.value);
                                        setSelectedPositionId(newValue as CommiteMemberPosition);
                                        if (positionError && newValue !== null) setPositionError(false);
                                    }}
                                >
                                    <CustomTooltip title={isTooltipGloballyEnabled ? getPositionText(CommiteMemberPosition.Baskan) : ""}>
                                        <FormControlLabel
                                            value={CommiteMemberPosition.Baskan}
                                            control={<Radio size="small" />}
                                            label={getPositionText(CommiteMemberPosition.Baskan)}
                                        />
                                    </CustomTooltip>
                                    <CustomTooltip title={isTooltipGloballyEnabled ? getPositionText(CommiteMemberPosition.Uye) : ""}>
                                        <FormControlLabel
                                            value={CommiteMemberPosition.Uye}
                                            control={<Radio size="small" />}
                                            label={getPositionText(CommiteMemberPosition.Uye)}
                                        />
                                    </CustomTooltip>
                                </RadioGroup>
                                {positionHelperText && <Typography variant="caption" color="error">{positionHelperText}</Typography>}
                            </FormControl>
                        </Grid>

                        {/* Submission Buttons */}
                        <Grid item xs={12} display="flex" justifyContent="flex-end" mt={1}>
                            <Stack direction="row" spacing={1}>
                                {editingId !== null ? (
                                    <>
                                        <CustomTooltip title={isTooltipGloballyEnabled ? "Seçili Üyeyi güncelleyin" : ""}>
                                            <Button
                                                variant="contained"
                                                color="info"
                                                onClick={editCommiteeMember}
                                                disabled={loadingButton}
                                            >
                                                {loadingButton ? <>
                                                    <CircularProgress size={20} color="inherit" sx={{ mr: 1 }} /> Beklemek....
                                                </> : 'Düzenlemek'}
                                            </Button>
                                        </CustomTooltip>
                                        <CustomTooltip title={isTooltipGloballyEnabled ? "Güncellemeyi iptal et ve yeni Üye moduna dön" : ""}>
                                            <Button variant="outlined" color="secondary" onClick={handleCancelEdit}>
                                                İptal Et
                                            </Button>
                                        </CustomTooltip>
                                    </>
                                ) : (

                                    <>
                                        {hasCreatePermission && (
                                            <CustomTooltip title={isTooltipGloballyEnabled ? "Yeni bir Komite Üyesi ekle" : ""}>
                                                <Button
                                                    variant="contained"
                                                    color="success"
                                                    onClick={insertCommiteeMember}
                                                    disabled={loadingButton}
                                                >
                                                    {loadingButton ? <>
                                                        <CircularProgress size={20} color="inherit" sx={{ mr: 1 }} /> Beklemek....
                                                    </> : 'Yeni Üye Ekle'}
                                                </Button>
                                            </CustomTooltip>

                                        )}
                                    </>
                                )}
                            </Stack>
                        </Grid>
                    </Grid>
                )}
            </div>

            <>

                {alertMessage && (
                    <Stack sx={{ width: '100%', mt: 2 }} spacing={2}>
                        <Alert severity={alertSeverity} onClose={clearAlert}>
                            {alertMessage}
                        </Alert>
                    </Stack>
                )}
            </>
            <BlankCard>


                <Grid item xs={12} mt={2} mr={2}>
                    <Stack direction="row" spacing={2} justifyContent="flex-end">
                        {hasDownloadPermission && (
                            <Grid item xs={12} sm={6} md={4} sx={{ textAlign: 'right' }}>
                                <CustomTooltip title={isTooltipGloballyEnabled ? "Tüm verileri farklı formatlarda indir" : ""}>
                                    <Button
                                        variant="contained"
                                        color="primary"
                                        onClick={() => setOpenDownloadModal(true)}
                                        startIcon={<IconFileDownload />}
                                    >
                                        Tümünü İndir
                                    </Button>
                                </CustomTooltip>
                            </Grid>
                        )}
                    </Stack>
                </Grid>
                <Box sx={{ p: 2 }}>
                    <Grid container spacing={2} alignItems="center">
                        <Grid item xs={12} sm={6} md={8}>
                            <TextField
                                label="Komite Üyesi Ara (Ad/Soyad/Pozisyon)"
                                variant="outlined"
                                fullWidth
                                value={searchTerm}
                                onChange={handleSearchChange}
                                InputProps={{
                                    startAdornment: (
                                        <InputAdornment position="start">
                                            <IconSearch size={20} />
                                        </InputAdornment>
                                    ),
                                }}
                            />
                        </Grid>


                        <Grid item xs={12} sm={6} md={4}>
                            <ToggleButtonGroup
                                value={statusFilter}
                                exclusive
                                onChange={handleStatusFilterChange}
                                aria-label="Status filter"
                                fullWidth
                            >
                                <StyledToggleButton
                                    value="all"
                                    aria-label="all members"
                                >
                                    Tümü
                                </StyledToggleButton>
                                <StyledToggleButton
                                    value="active"
                                    aria-label="active members"
                                >
                                    Aktif
                                </StyledToggleButton>
                                <StyledToggleButton
                                    value="inactive"
                                    aria-label="inactive members"
                                >
                                    Pasif
                                </StyledToggleButton>
                            </ToggleButtonGroup>
                        </Grid>
                    </Grid>
                </Box>
                <TableContainer>
                    <Table aria-label="commitee members table">
                        <TableHead style={{ background: "rgb(149 147 125 / 65%)" }}>
                            <TableRow>
                                <StyledTableCell>
                                    <TableSortLabel
                                        active={orderBy === 'name'}
                                        direction={orderBy === 'name' ? order : 'asc'}
                                        onClick={() => handleRequestSort('name')}
                                        style={{ color: "#171c23" }}
                                    >
                                        <Typography variant="h6">Adı</Typography>
                                    </TableSortLabel>
                                </StyledTableCell>
                                <StyledTableCell>
                                    <TableSortLabel
                                        active={orderBy === 'family'}
                                        direction={orderBy === 'family' ? order : 'asc'}
                                        onClick={() => handleRequestSort('family')}
                                        style={{ color: "#171c23" }}
                                    >
                                        <Typography variant="h6">Soyadı</Typography>
                                    </TableSortLabel>
                                </StyledTableCell>
                                <StyledTableCell>
                                    <TableSortLabel
                                        active={orderBy === 'positionTitle'}
                                        direction={orderBy === 'positionTitle' ? order : 'asc'}
                                        onClick={() => handleRequestSort('positionTitle')}
                                        style={{ color: "#171c23" }}
                                    >
                                        <Typography variant="h6">Pozisyon</Typography>
                                    </TableSortLabel>
                                </StyledTableCell>
                                <StyledTableCell>
                                    <TableSortLabel
                                        active={orderBy === 'createAt'}
                                        direction={orderBy === 'createAt' ? order : 'asc'}
                                        onClick={() => handleRequestSort('createAt')}
                                        style={{ color: "#171c23" }}
                                    >
                                        <Typography variant="h6">Oluşturulma Tarihi</Typography>
                                    </TableSortLabel>
                                </StyledTableCell>
                                <StyledTableCell>
                                    <TableSortLabel
                                        active={orderBy === 'status'}
                                        direction={orderBy === 'status' ? order : 'asc'}
                                        onClick={() => handleRequestSort('status')}
                                        style={{ color: "#171c23" }}
                                    >
                                        <Typography variant="h6">Durum</Typography>
                                    </TableSortLabel>
                                </StyledTableCell>
                                <StyledTableCell></StyledTableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {loadingData ? (
                                <TableRow>
                                    <StyledTableCell colSpan={6} align="center">
                                        <CircularProgress />
                                        <Typography variant="subtitle1" color="textSecondary">
                                            Komite Üyeleri yükleniyor...
                                        </Typography>
                                    </StyledTableCell>
                                </TableRow>
                            ) : paginatedMembers.length > 0 ? (
                                paginatedMembers.map((row) => (
                                    <TableRow key={row.id} sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                                        <StyledTableCell>
                                            <Typography variant="body1">{row.name}</Typography>
                                        </StyledTableCell>
                                        <StyledTableCell>
                                            <Typography variant="body1">{row.family}</Typography>
                                        </StyledTableCell>
                                        <StyledTableCell>
                                            <Typography variant="body1">{row.positionTitle}</Typography>
                                        </StyledTableCell>
                                        <StyledTableCell>
                                            <Typography variant="body1">{formatDateDisplay(row.createAt)}</Typography>
                                        </StyledTableCell>
                                        <StyledTableCell>
                                            <Chip
                                                label={row.status}
                                                sx={{
                                                    backgroundColor:
                                                        row.recordStatus === PositionStatus.Deleted
                                                            ? (theme) => theme.palette.primary.light
                                                            : row.recordStatus === PositionStatus.Inactive
                                                                ? (theme) => theme.palette.error.light
                                                                : (theme) => theme.palette.success.light,
                                                    color:
                                                        row.recordStatus === PositionStatus.Deleted
                                                            ? (theme) => theme.palette.primary.main
                                                            : row.recordStatus === PositionStatus.Inactive
                                                                ? (theme) => theme.palette.error.main
                                                                : (theme) => theme.palette.success.main,
                                                }}
                                            />
                                        </StyledTableCell>
                                        <StyledTableCell>
                                            <CustomTooltip title={isTooltipGloballyEnabled ? "Daha fazla seçenek" : ""}>
                                                <IconButton
                                                    id={`basic-button-${row.id}`}
                                                    aria-controls={openMenu ? 'basic-menu' : undefined}
                                                    aria-haspopup="true"
                                                    aria-expanded={openMenu ? 'true' : undefined}
                                                    onClick={(event) => handleClickMenu(event, row)}
                                                >
                                                    <IconDots width={18} />
                                                </IconButton>
                                            </CustomTooltip>
                                            <Menu
                                                id="basic-menu"
                                                anchorEl={anchorEl}
                                                open={openMenu}
                                                onClose={handleCloseMenu}
                                                MenuListProps={{
                                                    'aria-labelledby': `basic-button-${selectedRowForMenu?.id}`,
                                                }}
                                            >
                                                {hasEditPermission && selectedRowForMenu?.recordStatus === PositionStatus.Active && (
                                                    <CustomTooltip placement="left" title={isTooltipGloballyEnabled ? "Bu Üyeyi pasif yap" : ""}>
                                                        <MuiMenuItem onClick={handleSetInactive}>
                                                            <ListItemIcon>
                                                                <DoNotDisturbOnRoundedIcon width={18} />
                                                            </ListItemIcon>
                                                            Pasif Yap
                                                        </MuiMenuItem>
                                                    </CustomTooltip>
                                                )}
                                                {hasEditPermission && selectedRowForMenu?.recordStatus === PositionStatus.Inactive && (
                                                    <CustomTooltip placement="left" title={isTooltipGloballyEnabled ? "Bu Üyeyi aktif yap" : ""}>
                                                        <MuiMenuItem onClick={handleSetActive}>
                                                            <ListItemIcon>
                                                                <DoneRoundedIcon width={18} />
                                                            </ListItemIcon>
                                                            Aktif Yap
                                                        </MuiMenuItem>
                                                    </CustomTooltip>
                                                )}
                                                {hasEditPermission && (
                                                    <CustomTooltip placement="left" title={isTooltipGloballyEnabled ? "Bu Üyeyi düzenle" : ""}>
                                                        <MuiMenuItem onClick={handleEditClick}>
                                                            <ListItemIcon>
                                                                <IconEdit width={18} />
                                                            </ListItemIcon>
                                                            Düzenlemek
                                                        </MuiMenuItem>
                                                    </CustomTooltip>
                                                )}
                                                {hasDeletePermission && (
                                                    <CustomTooltip placement="left" title={isTooltipGloballyEnabled ? "Bu Üyeyi sil" : ""}>
                                                        <MuiMenuItem onClick={handleClickOpenDeleteModal}>
                                                            <ListItemIcon>
                                                                <IconTrash width={18} />
                                                            </ListItemIcon>
                                                            Silmek
                                                        </MuiMenuItem>
                                                    </CustomTooltip>
                                                )}
                                            </Menu>
                                        </StyledTableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <StyledTableCell colSpan={6} align="center">
                                        <Typography variant="subtitle1" color="textSecondary">
                                            Hiç Komite Üyesi bulunamadı.
                                        </Typography>
                                    </StyledTableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
                <TablePagination
                    rowsPerPageOptions={[5, 10, 25]}
                    component="div"
                    count={sortedAndFilteredMembers.length}
                    rowsPerPage={rowsPerPage}
                    page={page}
                    onPageChange={handleChangePage}
                    onRowsPerPageChange={handleChangeRowsPerPage}
                    labelRowsPerPage="Satır başına düşen:"
                    labelDisplayedRows={({ from, to, count }) => `${from}-${to} / ${count !== -1 ? count : `+${to}`}`}
                />
            </BlankCard>

            {/* Delete Modal */}
            <DeleteCommiteeMembers
                openModal={openDeleteModal}
                onClose={handleClickCloseDeleteModal}
                memberIdToDelete={memberIdToDelete}
                onDeleteSuccess={getListCommiteeMembers}
                showAlert={showAlert}
            />

            {/* Download Modal */}
            <Dialog
                open={openDownloadModal}
                onClose={() => setOpenDownloadModal(false)}
            >
                <DialogTitle>Dosya Formatını Seçin</DialogTitle>
                <DialogContent>
                    <Stack direction="column" spacing={2}>
                        <Button
                            variant="contained"
                            color="primary"
                            startIcon={<IconFileDownload />}
                            onClick={handleDownloadAllMembersPDF}
                        >
                            PDF Olarak İndir
                        </Button>
                        <Button
                            variant="contained"
                            color="success"
                            startIcon={<IconFileDownload />}
                            onClick={handleExportExcel}
                        >
                            Excel Olarak İndir
                        </Button>
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenDownloadModal(false)} color="secondary">
                        İptal
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );
};

export default ListCommiteeMembers;