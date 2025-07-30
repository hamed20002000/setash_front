// ListUserOperationsModal.tsx
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate } from "react-router-dom";
import {
    Button,
    Dialog,
    AppBar,
    Toolbar,
    IconButton,
    Typography,
    List,
    ListItem,
    ListItemText,
    ListItemIcon,
    Checkbox,
    CircularProgress,
    Box,
    DialogContent,
    Divider,
    Grid,
    Paper,
    Collapse,
} from '@mui/material';
import Slide from '@mui/material/Slide';
import { IconX, IconChevronDown, IconChevronRight } from '@tabler/icons-react';
import { TransitionProps } from '@mui/material/transitions';
import axios from 'axios';
import server from '../../../assets/address.json'; // مطمئن شوید مسیر صحیح است

import { useTooltip, CustomTooltip } from 'src/context/TooltipContext'; // مطمئن شوید مسیر صحیح است

const Transition = React.forwardRef(function Transition(
    props: TransitionProps & {
        children: React.ReactElement;
    },
    ref: React.Ref<unknown>,
) {
    return <Slide direction="up" ref={ref} {...props} />;
});

// ---------------------------------------------------------
// تعریف انواع داده‌ها (Interfaces)
// ---------------------------------------------------------

interface SystemOperation {
    id: string;
    name: string;
    createAt: string;
    recordStatus: number;
}

interface MenuOperation {
    id: string; // این ID مربوط به خود پیوند Menu-Operation است
    recordStatus: number;
    createAt: string;
    systemOperation: SystemOperation; // اطلاعات واقعی عملیات سیستمی (مثل "Görüntülemek")
}

interface Menu {
    id: string;
    name: string;
    url: string;
    depth: number;
    order: number;
    createAt: string;
    recordStatus: number;
    parent: { id: string; name: string; } | null;
    menuOperations: MenuOperation[];
    menus: Menu[]; // زیرمنوهای این منو
}

interface FlattenedMenu extends Menu {
    level: number;
    parentId: string | null;
}

// ساختار داده برای نگهداری وضعیت انتخاب شده‌ها: { menuId: [menuOperationId1, menuOperationId2, ...], ... }
interface SelectedMenuOperations {
    [menuId: string]: string[]; // کلید: menuId (string), مقدار: آرایه‌ای از menuOperation.id (string)
}

// ⭐️ مهم: نوع آیتم برگشتی از userMenuOperations API
interface UserAssignedOperationItem {
    id: string; // ID رکورد userMenuOperation
    recordStatus: number;
    createAt: string;
    menuOperation: MenuOperation; // شیء کامل menuOperation شامل systemOperation
}

const VIEW_OPERATION_ID = "35"; // ID عملیات "مشاهده" (Görüntülemek)

// ---------------------------------------------------------
// توابع کمکی (خارج از کامپوننت اصلی برای پایداری)
// ---------------------------------------------------------

/**
 * تابع بازگشتی برای فیلتر کردن منوها و عملیات‌های تو در تو بر اساس recordStatus = 0
 * @param menus آرایه‌ای از منوها برای فیلتر کردن
 * @returns آرایه‌ای جدید از منوهای فیلتر شده
 */
const filterMenusRecursively = (menus: Menu[]): Menu[] => {
    return menus.reduce((acc: Menu[], menu) => {
        // ابتدا عملیات‌های این منو را فیلتر می‌کنیم
        const filteredMenuOperations = menu.menuOperations.filter(op => op.recordStatus === 0);

        // سپس منوهای فرزند را به صورت بازگشتی فیلتر می‌کنیم
        const filteredChildMenus = menu.menus && menu.menus.length > 0
            ? filterMenusRecursively(menu.menus)
            : [];

        // اگر خود منو recordStatus = 0 باشد، آن را اضافه می‌کنیم.
        // حتی اگر منوهای فرزند یا عملیات‌های فیلتر شده داشته باشد.
        if (menu.recordStatus === 0) {
            const newMenu = {
                ...menu,
                menuOperations: filteredMenuOperations,
                menus: filteredChildMenus,
            };
            acc.push(newMenu);
        }
        return acc;
    }, []);
};


const findMenuInTreePure = (menus: Menu[], menuId: string): Menu | undefined => {
    for (const menu of menus) {
        if (menu.id === menuId) {
            return menu;
        }
        if (menu.menus && menu.menus.length > 0) {
            const found = findMenuInTreePure(menu.menus, menuId);
            if (found) return found;
        }
    }
    return undefined;
};

const getAllDescendantMenuIdsPure = (
    startMenuId: string,
    allMenusData: Menu[],
    foundMenuIds: Set<string> = new Set()
): Set<string> => {
    const menu = findMenuInTreePure(allMenusData, startMenuId);

    if (!menu) return foundMenuIds;

    foundMenuIds.add(menu.id);

    if (menu.menus && menu.menus.length > 0) {
        menu.menus.forEach(child => {
            getAllDescendantMenuIdsPure(child.id, allMenusData, foundMenuIds);
        });
    }
    return foundMenuIds;
};

// ---------------------------------------------------------
// RECURSIVE COMPONENT: MenuItemRenderer
// ---------------------------------------------------------

interface MenuItemRendererProps {
    menu: FlattenedMenu;
    selectedMenuId: string | null;
    selectedMenuOperations: SelectedMenuOperations;
    onMenuClick: (menu: FlattenedMenu) => void;
    allMenus: Menu[];
    isTooltipGloballyEnabled: boolean;
    VIEW_OPERATION_ID: string;
    expandedMenus: Set<string>;
    onToggleExpand: (menuId: string) => void;
}

const MenuItemRenderer: React.FC<MenuItemRendererProps> = ({
    menu,
    selectedMenuId,
    selectedMenuOperations,
    onMenuClick,
    allMenus,
    isTooltipGloballyEnabled,
    VIEW_OPERATION_ID,
    expandedMenus,
    onToggleExpand,
}) => {
    const hasChildren = menu.menus && menu.menus.length > 0;
    const isOpen = expandedMenus.has(menu.id);

    const parentHasViewAccess = useMemo(() => {
        if (!menu.parentId) return true;
        const parentMenu = findMenuInTreePure(allMenus, menu.parentId);
        if (!parentMenu) return true;

        // پیدا کردن menuOperation.id مربوط به VIEW_OPERATION_ID در والد
        // ✅ فیلتر کردن عملیات مشاهده والد بر اساس recordStatus = 0
        const viewOpForParent = parentMenu.menuOperations.find(op => op.systemOperation.id === VIEW_OPERATION_ID && op.recordStatus === 0);

        // چک کردن اینکه آیا menuOperation.id مربوط به VIEW_OPERATION_ID والد در selectedMenuOperations وجود دارد.
        return viewOpForParent ? (selectedMenuOperations[menu.parentId]?.includes(String(viewOpForParent.id)) || false) : true;
    }, [menu.parentId, allMenus, selectedMenuOperations, VIEW_OPERATION_ID]);

    const isMenuDisabled = !parentHasViewAccess && menu.depth > 0;

    const handleMenuSelectionClick = useCallback((event: React.MouseEvent) => {
        if (hasChildren && event.target instanceof Element && (event.target.closest('.MuiIconButton-root') || event.target.closest('svg'))) {
            event.stopPropagation();
            onToggleExpand(menu.id);
        } else {
            onMenuClick(menu);
            if (hasChildren && !isOpen) {
                onToggleExpand(menu.id);
            }
        }
    }, [menu, hasChildren, onMenuClick, onToggleExpand, isOpen]);

    return (
        <>
            <CustomTooltip
                title={isTooltipGloballyEnabled ? (isMenuDisabled ? `"${findMenuInTreePure(allMenus, menu.parentId || '')?.name}" menüsünün "Görüntülemek" erişimi olmadan bu menüyü seçemezsiniz.` : menu.name) : ""}
            >
                <ListItem
                    button
                    onClick={handleMenuSelectionClick}
                    selected={selectedMenuId === menu.id}
                    disabled={isMenuDisabled}
                    sx={{
                        pl: menu.level * 2 + 2,
                        borderBottom: '1px solid rgba(0, 0, 0, 0.05)',
                        '&.Mui-selected': {
                            bgcolor: (theme) => theme.palette.action.selected,
                        },
                        '&.Mui-disabled': {
                            opacity: 0.5,
                            pointerEvents: 'none',
                        },
                    }}
                >
                    {hasChildren ? (
                        <IconButton onClick={(e) => { e.stopPropagation(); onToggleExpand(menu.id); }} size="small" sx={{ p: 0, mr: 1 }}>
                            {isOpen ? <IconChevronDown size={16} /> : <IconChevronRight size={16} />}
                        </IconButton>
                    ) : (
                        <Box sx={{ width: '24px', mr: 1 }} />
                    )}
                    <ListItemText primary={menu.name} />
                    {selectedMenuOperations[menu.id] && selectedMenuOperations[menu.id].length > 0 && (
                        <ListItemIcon sx={{ minWidth: 24, justifyContent: 'flex-end' }}>
                            <Checkbox
                                size="small"
                                checked={true}
                                disableRipple
                                disabled
                            />
                        </ListItemIcon>
                    )}
                </ListItem>
            </CustomTooltip>
            {hasChildren && (
                <Collapse in={isOpen} timeout="auto" unmountOnExit>
                    <List component="div" disablePadding dense>
                        {menu.menus.sort((a, b) => a.order - b.order).map((childMenu) => (
                            <MenuItemRenderer
                                key={childMenu.id}
                                menu={{ ...childMenu, level: menu.level + 1, parentId: menu.id }}
                                selectedMenuId={selectedMenuId}
                                selectedMenuOperations={selectedMenuOperations}
                                onMenuClick={onMenuClick}
                                allMenus={allMenus} // allMenus اینجا فیلتر شده است
                                isTooltipGloballyEnabled={isTooltipGloballyEnabled}
                                VIEW_OPERATION_ID={VIEW_OPERATION_ID}
                                expandedMenus={expandedMenus}
                                onToggleExpand={onToggleExpand}
                            />
                        ))}
                    </List>
                </Collapse>
            )}
        </>
    );
};

// ---------------------------------------------------------
// کامپوننت اصلی ListUserOperationsModal
// ---------------------------------------------------------

type MainProps = { // تغییر نام Props به MainProps برای جلوگیری از تداخل
    openOperationsModal: boolean;
    onClose: () => void;
    userId: string | null;
    showAlert: (message: string, severity: 'success' | 'error' | 'warning' | 'info') => void;
};

const ListUserOperationsModal = ({ openOperationsModal, onClose, userId, showAlert }: MainProps) => { // استفاده از MainProps
    const navigate = useNavigate();
    const [allMenus, setAllMenus] = useState<Menu[]>([]);
    const [selectedMenuOperations, setSelectedMenuOperations] = useState<SelectedMenuOperations>({});
    const [loading, setLoading] = useState<boolean>(true);
    const [saving, setSaving] = useState<boolean>(false);
    const [selectedMenuId, setSelectedMenuId] = useState<string | null>(null);
    const [activeMenu, setActiveMenu] = useState<Menu | null>(null);

    const [expandedMenus, setExpandedMenus] = useState<Set<string>>(new Set());

    const { isTooltipGloballyEnabled } = useTooltip();

    const removeViewAccessFromChildren = useCallback((
        menuId: string,
        currentSelectedOps: SelectedMenuOperations
    ): SelectedMenuOperations => {
        const newSelected = { ...currentSelectedOps };
        const descendantMenuIds = getAllDescendantMenuIdsPure(menuId, allMenus);

        descendantMenuIds.forEach(id => {
            if (newSelected[id]) {
                delete newSelected[id];
            }
        });

        return newSelected;
    }, [allMenus]);

    // ------------------------- توابع فراخوانی API (Data Fetching) -------------------------

    const fetchAllMenus = useCallback(async () => {
        const authToken = localStorage.getItem('authToken');
        if (!authToken) {
            showAlert('Lütfen giriş yapın.', 'warning');
            return [];
        }
        try {
            const response = await axios.get(server.baseurl + server.baseinfo + 'get-menus', {
                headers: {
                    "Accept": "application/json",
                    "Authorization": `Bearer ${authToken}`
                }
            });
            if (response.data.httpStatusCode === 200) {
                // ✅ استفاده از تابع بازگشتی برای فیلتر کردن کل درخت
                const fetchedMenus = response.data.data as Menu[];
                return filterMenusRecursively(fetchedMenus);
            } else {
                showAlert(response.data.message || 'Menü listesi alınırken bir hata oluştu.', 'error');
                return [];
            }
        } catch (error: any) {
            console.error("Error fetching all menus:", error);
            showAlert('Menü listesi alınırken bir hata oluştu, lütfen tekrar deneyin.', 'error');
            return [];
        }
    }, [showAlert]);

    // ✅ اصلاح شده: fetchUserMenuOperations برای استخراج `menuId` از `menuOperation.id` و فیلتر recordStatus
    const fetchUserMenuOperations = useCallback(async (currentUserId: string, menus: Menu[]) => {
        const authToken = localStorage.getItem('authToken');
        if (!authToken) {
            showAlert('Lütfen giriş yapın.', 'warning');
            return {};
        }
        try {
            const response = await axios.get(`${server.baseurl}${server.user}get-user-with-role-and-operations/${currentUserId}`, {
                headers: {
                    "Accept": "application/json",
                    "Authorization": `Bearer ${authToken}`
                }
            });

            if (response.data.httpStatusCode === 200 && response.data.data && response.data.data.userMenuOperations) {
                const assignedOps: SelectedMenuOperations = {};

                // تابع کمکی برای پیدا کردن Menu ID از کل درخت منوها بر اساس MenuOperation ID
                const findMenuIdByMenuOperationId = (
                    menusToSearch: Menu[],
                    targetMenuOpId: string
                ): string | null => {
                    for (const m of menusToSearch) {
                        // فقط عملیات‌هایی که recordStatus = 0 هستند را در نظر بگیرید
                        if (m.menuOperations.some(op => String(op.id) === targetMenuOpId && op.recordStatus === 0)) {
                            return m.id;
                        }
                        if (m.menus && m.menus.length > 0) {
                            const foundInChild = findMenuIdByMenuOperationId(m.menus, targetMenuOpId);
                            if (foundInChild) return foundInChild;
                        }
                    }
                    return null;
                };

                // ✅ نوع item را با ساختار جدید API تطبیق می دهیم
                response.data.data.userMenuOperations.forEach((item: UserAssignedOperationItem) => {
                    // فقط آیتم‌هایی را اضافه کنید که خودشان recordStatus = 0 دارند و عملیاتشان هم recordStatus = 0 است
                    if (item.recordStatus === 0 && item.menuOperation.recordStatus === 0) {
                        const menuOperationId = item.menuOperation?.id;

                        if (menuOperationId) {
                            const menuIdForOperation = findMenuIdByMenuOperationId(menus, String(menuOperationId));

                            if (menuIdForOperation) {
                                if (!assignedOps[menuIdForOperation]) {
                                    assignedOps[menuIdForOperation] = [];
                                }
                                assignedOps[menuIdForOperation].push(String(menuOperationId));
                            } else {
                                console.warn(`Could not find parent menu for menuOperation ID: ${menuOperationId}. This operation will not be pre-selected.`);
                            }
                        } else {
                            console.warn(`Missing menuOperation ID in userMenuOperation item:`, item);
                        }
                    }
                });
                return assignedOps;
            } else {
                showAlert(response.data.message || 'Kullanıcı menü operasyonları alınırken bir hata oluştu veya format beklenmiyor.', 'error');
                return {};
            }
        } catch (error: any) {
            console.error("Error fetching user menu operations:", error);
            const errorMessage = error.response?.data?.message || 'Kullanıcı menü operasyonları alınırken bir hata oluştu, lütfen tekrar deneyin.';
            showAlert(errorMessage, 'error');
            if (error.response && error.response.status === 401) {
                localStorage.removeItem('authToken');
                navigate("/");
                showAlert('Oturumunuzun süresi doldu veya yetkiniz yok. Lütfen tekrar giriş yapın.', 'error');
            }
            return {};
        }
    }, [showAlert, navigate]);

    useEffect(() => {
        if (openOperationsModal && userId !== null) {
            setLoading(true);
            fetchAllMenus()
                .then(async (menus) => {
                    setAllMenus(menus); // لیست کامل منوهای فیلتر شده را در state ذخیره می‌کنیم
                    const assignedOps = await fetchUserMenuOperations(userId, menus); // menus را پاس می دهیم
                    setSelectedMenuOperations(assignedOps);

                    const initialExpanded = new Set<string>();
                    Object.keys(assignedOps).forEach(menuId => {
                        let currentMenu = findMenuInTreePure(menus, menuId); // از menus فیلتر شده استفاده می‌کنیم
                        while (currentMenu) {
                            initialExpanded.add(currentMenu.id);
                            if (currentMenu.parent) {
                                currentMenu = findMenuInTreePure(menus, currentMenu.parent.id); // از menus فیلتر شده استفاده می‌کنیم
                            } else {
                                break;
                            }
                        }
                    });
                    setExpandedMenus(initialExpanded);
                })
                .catch(err => {
                    console.error("Failed to load data for user permissions:", err);
                    showAlert('Datalar yüklenirken bir hata oluştu. Lütfen tekrar deneyin.', 'error');
                })
                .finally(() => {
                    setLoading(false);
                });
        } else if (!openOperationsModal) {
            setAllMenus([]);
            setSelectedMenuOperations({});
            setLoading(false);
            setSaving(false);
            setSelectedMenuId(null);
            setActiveMenu(null);
            setExpandedMenus(new Set());
        }
    }, [openOperationsModal, userId, fetchAllMenus, fetchUserMenuOperations, showAlert]);

    useEffect(() => {
        if (openOperationsModal && !loading && allMenus.length > 0 && selectedMenuId === null) {
            const rootMenus = allMenus.filter(m => m.depth === 0).sort((a, b) => a.order - b.order);
            const firstRootMenu = rootMenus[0];
            if (firstRootMenu) {
                setSelectedMenuId(firstRootMenu.id);
                setActiveMenu(firstRootMenu);
            }
        }
    }, [openOperationsModal, loading, allMenus, selectedMenuId]);

    // ------------------------- منطق مدیریت انتخاب‌ها و وابستگی‌ها -------------------------

    const handleToggleOperation = useCallback((menuOp: MenuOperation) => {
        setSelectedMenuOperations(prev => {
            let newSelected = { ...prev };
            let currentMenuOpsIds = newSelected[activeMenu!.id] || [];

            // پیدا کردن `menuOperation.id` مربوط به `VIEW_OPERATION_ID` در منوی فعال و فیلتر recordStatus = 0
            const viewOpInActiveMenu = activeMenu!.menuOperations.find(op => op.systemOperation.id === VIEW_OPERATION_ID && op.recordStatus === 0);

            const hasViewAccess = viewOpInActiveMenu ? currentMenuOpsIds.includes(String(viewOpInActiveMenu.id)) : false;

            const isCurrentlyChecked = currentMenuOpsIds.includes(String(menuOp.id));

            if (isCurrentlyChecked) {
                if (menuOp.systemOperation.id === VIEW_OPERATION_ID) {
                    newSelected = removeViewAccessFromChildren(activeMenu!.id, newSelected);
                    showAlert(' "Görüntülemek" erişimi kaldırıldığı için diğer tüm operasyonlar ve alt menülerin operasyonları da kaldırıldı.', 'info');
                } else {
                    newSelected[activeMenu!.id] = currentMenuOpsIds.filter(id => id !== String(menuOp.id));
                }
            } else {
                if (menuOp.systemOperation.id !== VIEW_OPERATION_ID && !hasViewAccess) {
                    showAlert('Bu menü için "Görüntülemek" erişimi olmadan başka operasyon seçemezsiniz.', 'warning');
                    return prev;
                }
                newSelected[activeMenu!.id] = [...currentMenuOpsIds, String(menuOp.id)];

                let currentMenu = findMenuInTreePure(allMenus, activeMenu!.id);
                while (currentMenu) {
                    // پیدا کردن عملیات مشاهده والد و فیلتر recordStatus = 0
                    const viewMenuOp = currentMenu.menuOperations.find(op => op.systemOperation.id === VIEW_OPERATION_ID && op.recordStatus === 0);
                    if (viewMenuOp && !(newSelected[currentMenu.id] || []).includes(String(viewMenuOp.id))) {
                        newSelected[currentMenu.id] = [...(newSelected[currentMenu.id] || []), String(viewMenuOp.id)];
                    }
                    if (!currentMenu.parent) break;
                    currentMenu = findMenuInTreePure(allMenus, currentMenu.parent.id);
                }
            }

            if (newSelected[activeMenu!.id] && newSelected[activeMenu!.id].length === 0) {
                delete newSelected[activeMenu!.id];
            }
            return newSelected;
        });
    }, [showAlert, removeViewAccessFromChildren, allMenus, activeMenu]);

    const handleToggleAllActiveMenuOperations = useCallback(() => {
        if (!activeMenu) return;

        const currentMenuSelectedOps = selectedMenuOperations[activeMenu.id] || [];
        // `allMenuOpsIds` حالا باید `menuOperation.id`های تمام عملیات‌های فعال (recordStatus = 0) این منو باشند.
        const allMenuOpsIds = activeMenu.menuOperations.filter(op => op.recordStatus === 0).map(op => String(op.id));

        // چک کردن دسترسی مشاهده با استفاده از `menuOperation.id` مربوط به `VIEW_OPERATION_ID` و فیلتر recordStatus = 0
        const viewOp = activeMenu.menuOperations.find(op => String(op.systemOperation.id) === VIEW_OPERATION_ID && op.recordStatus === 0);
        const hasViewAccess = viewOp ? currentMenuSelectedOps.includes(String(viewOp.id)) : false;

        setSelectedMenuOperations(prev => {
            let newSelected = { ...prev };
            if (currentMenuSelectedOps.length === allMenuOpsIds.length && allMenuOpsIds.length > 0) {
                newSelected = removeViewAccessFromChildren(activeMenu.id, newSelected);
            } else {
                if (!hasViewAccess && viewOp) { // اگر View Access وجود ندارد و عملیات View فعال هم هست
                    newSelected[activeMenu.id] = [...new Set([...allMenuOpsIds, String(viewOp.id)])];
                    showAlert('Tüm operasyonları seçmek için önce "Görüntülemek" erişimi eklendi.', 'info');
                } else {
                    newSelected[activeMenu.id] = allMenuOpsIds;
                }

                let currentMenu = findMenuInTreePure(allMenus, activeMenu.id);
                while (currentMenu) {
                    // پیدا کردن عملیات مشاهده والد و فیلتر recordStatus = 0
                    const parentViewOp = currentMenu.menuOperations.find(op => String(op.systemOperation.id) === VIEW_OPERATION_ID && op.recordStatus === 0);
                    if (parentViewOp && !(newSelected[currentMenu.id] || []).includes(String(parentViewOp.id))) {
                        newSelected[currentMenu.id] = [...(newSelected[currentMenu.id] || []), String(parentViewOp.id)];
                    }
                    if (!currentMenu.parent) break;
                    currentMenu = findMenuInTreePure(allMenus, currentMenu.parent.id);
                }
            }
            return newSelected;
        });
    }, [activeMenu, selectedMenuOperations, showAlert, removeViewAccessFromChildren, allMenus]);


    const handleMenuClick = useCallback((menu: FlattenedMenu) => {
        if (menu.depth > 0 && menu.parentId) {
            // پیدا کردن `menuOperation.id` مربوط به `VIEW_OPERATION_ID` والد و فیلتر recordStatus = 0
            const parentMenu = findMenuInTreePure(allMenus, menu.parentId);
            const parentViewOp = parentMenu?.menuOperations.find(op => String(op.systemOperation.id) === VIEW_OPERATION_ID && op.recordStatus === 0);

            // چک کردن دسترسی مشاهده والد با استفاده از `menuOperation.id` آن
            const parentHasViewAccess = parentViewOp ? (selectedMenuOperations[menu.parentId]?.includes(String(parentViewOp.id)) || false) : true;

            if (!parentHasViewAccess) {
                showAlert(`"${findMenuInTreePure(allMenus, menu.parentId || '')?.name}" menüsünün "Görüntülemek" erişimi olmadan bu alt menüyü seçemezsiniz.`, 'warning');
                return;
            }
        }
        setSelectedMenuId(menu.id);
        setActiveMenu(menu);
    }, [selectedMenuOperations, allMenus, showAlert]);

    const handleToggleExpand = useCallback((menuId: string) => {
        setExpandedMenus(prev => {
            const newExpanded = new Set(prev);
            if (newExpanded.has(menuId)) {
                newExpanded.delete(menuId);
            } else {
                newExpanded.add(menuId);
            }
            return newExpanded;
        });
    }, []);

    // ------------------------- تابع ذخیره داده‌ها (Save Operations) -------------------------
    const handleSaveOperations = async () => {
        if (userId === null) return;
        setSaving(true);
        const authToken = localStorage.getItem('authToken');
        if (!authToken) {
            showAlert('Lütfen giriş yapın.', 'warning');
            setSaving(false);
            return;
        }

        // ✅ Payload حالا یک آرایه ساده از `menuOperation.id`های فعال خواهد بود
        const menuOperationIdsPayload: number[] = [];
        for (const menuId in selectedMenuOperations) {
            const menu = findMenuInTreePure(allMenus, menuId);
            if (menu && menu.recordStatus === 0) { // اطمینان از recordStatus منو
                selectedMenuOperations[menuId].forEach(menuOpId => {
                    const menuOp = menu.menuOperations.find(op => op.id === menuOpId);
                    if (menuOp && menuOp.recordStatus === 0) { // اطمینان از recordStatus عملیات
                        menuOperationIdsPayload.push(Number(menuOpId));
                    }
                });
            }
        }

        try {
            const response = await axios.post(
                `${server.baseurl}${server.user}assign-user-operations`,
                { UserId: userId, menueOperationIds: menuOperationIdsPayload },
                {
                    headers: {
                        "Accept": "application/json",
                        'Content-Type': 'application/json',
                        "Authorization": `Bearer ${authToken}`
                    }
                }
            );

            if (response.data.httpStatusCode === 200 || response.data.httpStatusCode === 201) {
                showAlert('Operasyonlar başarıyla güncellendi!', 'success');
                onClose();
            } else {
                showAlert(response.data.message || 'Operasyonlar güncellenirken bir hata oluştu.', 'error');
            }
        } catch (error: any) {
            console.error("Error saving operations:", error);
            const errorMessage = error.response?.data?.message || 'Operasyonlar kaydedilirken beklenmeyen bir hata oluştu، لطفاً tekrar deneyین.';
            showAlert(errorMessage, 'error');
            if (error.response && error.response.status === 401) {
                localStorage.removeItem('authToken');
                navigate("/");
                showAlert('Oturumunuzun süresi doldu veya yetkiniz yok. Lütfen tekrar giriş yapın.', 'error');
            }
        } finally {
            setSaving(false);
        }
    };

    // ------------------------- محاسبات بهینه‌شده UI با useMemo -------------------------

    const activeMenuHasViewAccess = useMemo(() => {
        if (!activeMenu) return false;
        // چک کردن وجود `menuOperation.id` مربوط به `VIEW_OPERATION_ID` در لیست انتخاب شده و فیلتر recordStatus = 0
        const viewOp = activeMenu.menuOperations.find(op => String(op.systemOperation.id) === VIEW_OPERATION_ID && op.recordStatus === 0);
        return viewOp ? (selectedMenuOperations[activeMenu.id]?.includes(String(viewOp.id)) || false) : false;
    }, [activeMenu, selectedMenuOperations]);

    const isAllOperationsChecked = useMemo(() => {
        if (!activeMenu) return false;
        const currentSelectedOps = selectedMenuOperations[activeMenu.id] || [];
        // فقط عملیات‌هایی که recordStatus = 0 هستند را برای مقایسه "انتخاب همه" در نظر می‌گیریم
        const allOpsInActiveMenu = activeMenu.menuOperations.filter(op => op.recordStatus === 0).map(op => String(op.id));
        return currentSelectedOps.length === allOpsInActiveMenu.length && allOpsInActiveMenu.length > 0;
    }, [activeMenu, selectedMenuOperations]);

    const isAllOperationsIndeterminate = useMemo(() => {
        if (!activeMenu) return false;
        const currentSelectedOps = selectedMenuOperations[activeMenu.id] || [];
        // فقط عملیات‌های فعال را برای حالت نامشخص در نظر می‌گیریم
        const availableOperationsCount = activeMenu.menuOperations.filter(op => op.recordStatus === 0).length;
        return currentSelectedOps.length > 0 && currentSelectedOps.length < availableOperationsCount;
    }, [activeMenu, selectedMenuOperations]);

    return (
        <Dialog fullScreen open={openOperationsModal} onClose={onClose} TransitionComponent={Transition}>
            <AppBar sx={{ position: 'relative' }}>
                <Toolbar>
                    <CustomTooltip title={isTooltipGloballyEnabled ? "Kapat" : ""}>
                        <IconButton edge="start" color="inherit" onClick={onClose} aria-label="close">
                            <IconX width={24} height={24} />
                        </IconButton>
                    </CustomTooltip>
                    <Typography ml={2} flex={1} variant="h6" component="div">
                        Kullanıcı için Menü ve Operasyonları Seçin
                    </Typography>
                    <CustomTooltip title={isTooltipGloballyEnabled ? "Seçilen operasyonları kaydet" : ""}>
                        <Button autoFocus color="inherit" onClick={handleSaveOperations} disabled={loading || saving}>
                            {saving ? <CircularProgress size={20} color="inherit" /> : 'Kaydet'}
                        </Button>
                    </CustomTooltip>
                </Toolbar>
            </AppBar>
            <DialogContent sx={{ p: 0, height: 'calc(100vh - 64px)' }}>
                {loading ? (
                    <Box display="flex" justifyContent="center" alignItems="center" height="100%">
                        <CircularProgress />
                        <Typography ml={2}>Menüler ve operasyonlar yükleniyor...</Typography>
                    </Box>
                ) : (
                    <Grid container sx={{ height: '100%' }}>
                        <Grid item xs={12} sm={4} md={3} sx={{
                            borderRight: '1px solid rgba(0, 0, 0, 0.12)',
                            overflowY: 'auto',
                            height: '100%',
                            bgcolor: 'background.paper',
                        }}>
                            <Paper elevation={0} sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                                <Typography variant="h6" sx={{ p: 2, borderBottom: '1px solid rgba(0, 0, 0, 0.12)' }}>
                                    Menüler
                                </Typography>
                                <List component="nav" dense disablePadding sx={{ flexGrow: 1 }}>
                                    {allMenus.length > 0 ? (
                                        // allMenus از قبل فیلتر شده است، پس نیازی به فیلتر مجدد اینجا نیست
                                        allMenus.sort((a, b) => a.order - b.order).map((menu) => (
                                            <MenuItemRenderer
                                                key={menu.id}
                                                menu={{ ...menu, level: 0, parentId: null }}
                                                selectedMenuId={selectedMenuId}
                                                selectedMenuOperations={selectedMenuOperations}
                                                onMenuClick={handleMenuClick}
                                                allMenus={allMenus}
                                                isTooltipGloballyEnabled={isTooltipGloballyEnabled}
                                                VIEW_OPERATION_ID={VIEW_OPERATION_ID}
                                                expandedMenus={expandedMenus}
                                                onToggleExpand={handleToggleExpand}
                                            />
                                        ))
                                    ) : (
                                        <Box display="flex" justifyContent="center" alignItems="center" p={2}>
                                            <Typography color="textSecondary">Hiç menü bulunamadı.</Typography>
                                        </Box>
                                    )}
                                </List>
                            </Paper>
                        </Grid>

                        <Grid item xs={12} sm={8} md={9} sx={{
                            overflowY: 'auto',
                            height: '100%',
                            bgcolor: 'background.default',
                        }}>
                            <Paper elevation={0} sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                                <Typography variant="h6" sx={{ p: 2, borderBottom: '1px solid rgba(0, 0, 0, 0.12)' }}>
                                    {activeMenu ? `"${activeMenu.name}" Menüsü İçin Operasyonlar` : 'Bir menü seçin'}
                                </Typography>
                                <List component="div" dense disablePadding sx={{ flexGrow: 1 }}>
                                    {activeMenu && activeMenu.menuOperations.length > 0 ? (
                                        <>
                                            <CustomTooltip title={isTooltipGloballyEnabled ? "Tüm operasyonları seç/seçimi kaldır" : ""}>
                                                <ListItem
                                                    onClick={handleToggleAllActiveMenuOperations}
                                                    role="checkbox"
                                                    sx={{ py: 1, borderBottom: '1px solid rgba(0, 0, 0, 0.12)' }}
                                                >
                                                    <ListItemIcon>
                                                        <Checkbox
                                                            edge="start"
                                                            checked={isAllOperationsChecked}
                                                            indeterminate={isAllOperationsIndeterminate}
                                                            tabIndex={-1}
                                                            disableRipple
                                                        />
                                                    </ListItemIcon>
                                                    <ListItemText primary="Tümünü Seç / Seçimi Kaldır" />
                                                </ListItem>
                                            </CustomTooltip>
                                            <Divider />

                                            {activeMenu.menuOperations
                                                .filter(menuOp => menuOp.recordStatus === 0) // ✅ فیلتر کردن عملیات‌ها برای نمایش
                                                .map((menuOp) => {
                                                    const isOperationDisabled = menuOp.systemOperation.id !== VIEW_OPERATION_ID && !activeMenuHasViewAccess;
                                                    return (
                                                        <CustomTooltip
                                                            key={`op-tooltip-${menuOp.id}`}
                                                            title={isTooltipGloballyEnabled ? (isOperationDisabled ? `"${activeMenu.name}" menüsünün "Görüntülemek" erişimi olmadan bu operasyonu seçemezsiniz.` : menuOp.systemOperation.name) : ""}
                                                        >
                                                            <ListItem
                                                                key={menuOp.id}
                                                                onClick={() => handleToggleOperation(menuOp)}
                                                                role="checkbox"
                                                                disabled={isOperationDisabled}
                                                                sx={{ py: 0.5, '&.Mui-disabled': { opacity: 0.5, pointerEvents: 'none' } }}
                                                            >
                                                                <ListItemIcon>
                                                                    <Checkbox
                                                                        edge="start"
                                                                        checked={selectedMenuOperations[activeMenu.id]?.includes(String(menuOp.id)) || false}
                                                                        tabIndex={-1}
                                                                        disableRipple
                                                                        disabled={isOperationDisabled}
                                                                    />
                                                                </ListItemIcon>
                                                                <ListItemText primary={menuOp.systemOperation.name} />
                                                            </ListItem>
                                                        </CustomTooltip>
                                                    );
                                                })}
                                        </>
                                    ) : (
                                        <Box display="flex" justifyContent="center" alignItems="center" height="100%" p={2}>
                                            <Typography color="textSecondary">
                                                {activeMenu ? 'Bu menü için operasyon bulunamadı.' : 'Lütfen soldan bir menü seçin.'}
                                            </Typography>
                                        </Box>
                                    )}
                                </List>
                            </Paper>
                        </Grid>
                    </Grid>
                )}
            </DialogContent>
        </Dialog>
    );
};

export default ListUserOperationsModal;