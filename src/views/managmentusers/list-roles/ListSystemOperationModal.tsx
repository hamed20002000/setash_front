// ListSystemOperationModal.tsx
import React, { useEffect, useState, useCallback, useMemo } from 'react';
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
import server from '../../../assets/address.json';

import { useTooltip, CustomTooltip } from 'src/context/TooltipContext';

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
type Props = {
    openOperationModal: boolean;
    onClose: () => void;
    roleId: string | null;
    showAlert: (message: string, severity: 'success' | 'error' | 'warning' | 'info') => void;
};
interface SystemOperation {
    id: string;
    name: string;
    createAt: string;
    recordStatus: number;
}

interface MenuOperation {
    id: string; // ✅ این همان ID پیوند عملیات-منو است که به API ارسال می‌شود
    recordStatus: number;
    createAt: string;
    systemOperation: SystemOperation; // اطلاعات واقعی عملیات
}

interface Menu {
    id: string;
    name: string;
    url: string;
    depth: number;
    order: number;
    createAt: string;
    recordStatus: number;
    parent: any | null;
    menuOperations: MenuOperation[];
    menus: Menu[];
}

interface FlattenedMenu extends Menu {
    level: number;
    parentId: string | null;
}

// ✅ ساختار داده برای نگهداری وضعیت انتخاب شده‌ها: { menuId: [menuOpId1, menuOpId2, ...], ... }
// کلید: ID منو (string), مقدار: آرایه‌ای از IDهای MenuOperation (string)
interface SelectedMenuOperations {
    [menuId: string]: string[];
}

const VIEW_OPERATION_ID = "35";

// ---------------------------------------------------------
// توابع کمکی
// ---------------------------------------------------------

/**
 * تابع بازگشتی برای فیلتر کردن منوها و عملیات‌های تو در تو بر اساس recordStatus = 0
 * @param menus آرایه‌ای از منوها برای فیلتر کردن
 * @returns آرایه‌ای جدید از منوهای فیلتر شده
 */
const filterMenusByRecordStatus = (menus: Menu[]): Menu[] => {
    return menus.reduce((acc: Menu[], menu) => {
        // ابتدا عملیات‌های این منو را فیلتر می‌کنیم
        const filteredMenuOperations = menu.menuOperations.filter(op => op.recordStatus === 0);

        // سپس منوهای فرزند را به صورت بازگشتی فیلتر می‌کنیم
        const filteredChildMenus = menu.menus && menu.menus.length > 0
            ? filterMenusByRecordStatus(menu.menus)
            : [];

        // اگر خود منو recordStatus = 0 باشد، یا اگر عملیات‌های فیلتر شده‌ای داشته باشد،
        // یا اگر منوهای فرزند فیلتر شده‌ای داشته باشد، آن را اضافه می‌کنیم.
        // این منطق تضمین می‌کند که اگر یک منو خودش recordStatus=1 باشد ولی فرزندی با recordStatus=0 داشته باشد، آن فرزند قابل مشاهده باشد.
        // اگر می‌خواهید والد نیز حتما recordStatus=0 باشد، شرط recordStatus === 0 را برای والد هم بگذارید.
        if (menu.recordStatus === 0) { // فقط منوهایی که recordStatus=0 دارند را نگه می‌داریم
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

    // برای بررسی دسترسی والد، باید menuOp.id مربوط به VIEW_OPERATION_ID والد را پیدا کنیم
    const parentHasViewAccess = useMemo(() => {
        if (!menu.parentId) return true;
        const parentMenu = findMenuInTreePure(allMenus, menu.parentId);
        if (!parentMenu) return true; // اگر والد پیدا نشد، فرض می‌کنیم دسترسی دارد

        const viewOpForParent = parentMenu.menuOperations.find(op => op.systemOperation.id === VIEW_OPERATION_ID);
        if (!viewOpForParent) return true; // اگر عملیات مشاهده برای والد وجود ندارد

        return selectedMenuOperations[menu.parentId]?.includes(viewOpForParent.id) || false;
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
                        {/* اینجا نیز باید منوهای فرزند فیلتر شده را ارسال کنیم */}
                        {menu.menus.sort((a, b) => a.order - b.order).map((childMenu) => (
                            <MenuItemRenderer
                                key={childMenu.id}
                                menu={{ ...childMenu, level: menu.level + 1, parentId: menu.id }}
                                selectedMenuId={selectedMenuId}
                                selectedMenuOperations={selectedMenuOperations}
                                onMenuClick={onMenuClick}
                                allMenus={allMenus} // allMenus اینجا باید شامل منوهای فیلتر شده باشد
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
// کامپوننت اصلی ListSystemOperationModal
// ---------------------------------------------------------

const ListSystemOperationModal = ({ openOperationModal, onClose, roleId, showAlert }: Props) => {
    const [allMenus, setAllMenus] = useState<Menu[]>([]);
    const [selectedMenuOperations, setSelectedMenuOperations] = useState<SelectedMenuOperations>({});
    const [loading, setLoading] = useState<boolean>(true);
    const [saving, setSaving] = useState<boolean>(false);
    const [selectedMenuId, setSelectedMenuId] = useState<string | null>(null);
    const [activeMenu, setActiveMenu] = useState<Menu | null>(null);

    const [expandedMenus, setExpandedMenus] = useState<Set<string>>(new Set());

    const { isTooltipGloballyEnabled } = useTooltip();

    // ✅ اصلاح شده: تابع removeViewAccessFromChildren از getAllDescendantMenuIdsPure استفاده می کند.
    const removeViewAccessFromChildren = useCallback((
        menuId: string,
        currentSelectedOps: SelectedMenuOperations
    ): SelectedMenuOperations => {
        const newSelected = { ...currentSelectedOps };
        const descendantMenuIds = getAllDescendantMenuIdsPure(menuId, allMenus); // allMenus اینجا باید فیلتر شده باشد

        descendantMenuIds.forEach(id => {
            // برای هر منوی فرزند یا خودش، تمام menuOp.id های آن را حذف کن
            if (newSelected[id]) {
                delete newSelected[id];
            }
        });

        return newSelected;
    }, [allMenus]);


    const flattenMenus = useCallback((menus: Menu[], level: number = 0, parentId: string | null = null): FlattenedMenu[] => {
        let flattened: FlattenedMenu[] = [];
        menus.sort((a, b) => a.order - b.order).forEach(menu => {
            // منو را فقط در صورتی اضافه می‌کنیم که recordStatus آن 0 باشد
            if (menu.recordStatus === 0) {
                const newMenu = {
                    ...menu,
                    // عملیات‌های منو را نیز فیلتر می‌کنیم
                    menuOperations: menu.menuOperations.filter(op => op.recordStatus === 0),
                    level,
                    parentId
                };
                flattened.push(newMenu);
                // اگر منوهای فرزند داشته باشد، آن‌ها را نیز به صورت بازگشتی فیلتر و اضافه می‌کنیم
                if (menu.menus && menu.menus.length > 0) {
                    flattened = flattened.concat(
                        flattenMenus(
                            menu.menus.filter(child => child.recordStatus === 0), // فیلتر کردن منوهای فرزند
                            level + 1,
                            menu.id
                        )
                    );
                }
            }
        });
        return flattened;
    }, []);

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
                // ✅ تغییر اصلی: فیلتر کردن منوها و عملیات‌های تو در تو
                const fetchedMenus = response.data.data as Menu[];
                return filterMenusByRecordStatus(fetchedMenus);
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

    const fetchRoleMenuOperations = useCallback(async (currentRoleId: string, menus: Menu[]) => {
        const authToken = localStorage.getItem('authToken');
        if (!authToken) {
            showAlert('Lütfen giriş yapın.', 'warning');
            return {};
        }
        try {
            const response = await axios.get(`${server.baseurl}${server.user}get-role-with-operations/${currentRoleId}`, {
                headers: {
                    "Accept": "application/json",
                    "Authorization": `Bearer ${authToken}`
                }
            });
            if (response.data.httpStatusCode === 200 && response.data.data && response.data.data.roleMenuOperations) {
                const assignedOps: SelectedMenuOperations = {};

                // ⭐️ تابع کمکی برای پیدا کردن Menu ID از کل درخت منوها بر اساس MenuOperation ID
                const findMenuIdByMenuOperationId = (
                    menusToSearch: Menu[],
                    targetMenuOpId: string
                ): string | null => {
                    for (const m of menusToSearch) {
                        // فقط عملیات‌هایی که recordStatus = 0 هستند را در نظر بگیرید
                        if (m.menuOperations.some(op => op.id === targetMenuOpId && op.recordStatus === 0)) {
                            return m.id; // منویی که شامل این menuOperation است را پیدا کردیم
                        }
                        // اگر منو فرزند دارد، در فرزندان نیز بازگشتی جستجو می‌کنیم
                        if (m.menus && m.menus.length > 0) {
                            const foundInChild = findMenuIdByMenuOperationId(m.menus, targetMenuOpId);
                            if (foundInChild) return foundInChild;
                        }
                    }
                    return null; // پیدا نشد
                };

                // ⭐️ نوع `item` را با دقت بیشتر و بر اساس API دقیق شما تعریف می‌کنیم
                response.data.data.roleMenuOperations.forEach((item: {
                    id: string, // ID رکورد RoleMenuOperation
                    recordStatus: number,
                    createAt: string,
                    menuOperation: MenuOperation // شیء MenuOperation شامل ID و systemOperation
                }) => {
                    // فقط آیتم‌هایی را اضافه کنید که خودشان recordStatus = 0 دارند و عملیاتشان هم recordStatus = 0 است
                    if (item.recordStatus === 0 && item.menuOperation.recordStatus === 0) {
                        const menuIdForOperation = findMenuIdByMenuOperationId(menus, item.menuOperation.id);

                        if (menuIdForOperation) {
                            if (!assignedOps[menuIdForOperation]) {
                                assignedOps[menuIdForOperation] = [];
                            }
                            // ✅ ذخیره menuOperation.id (که همان item.menuOperation.id است)
                            // توصیه: همه IDها را به string تبدیل کنید تا مشکلات type coercion نداشته باشید
                            assignedOps[menuIdForOperation].push(String(item.menuOperation.id));
                        } else {
                            console.warn(`Could not find parent menu for menuOperation ID: ${item.menuOperation.id}. This operation will not be pre-selected.`);
                        }
                    }
                });
                return assignedOps;
            } else {
                showAlert(response.data.message || 'Rol menü operasyonları alınırken bir hata oluştu.', 'error');
                return {};
            }
        } catch (error: any) {
            console.error("Error fetching role menu operations:", error);
            showAlert('Rol menü operasyonları alınırken bir hata oluştu, lütfen tekrar deneyین.', 'error');
            return {};
        }
    }, [showAlert]);


    useEffect(() => {
        if (openOperationModal && roleId !== null) {
            setLoading(true);
            // فراخوانی fetchAllMenus و سپس در موفقیت آن، fetchRoleMenuOperations را فراخوانی می‌کنیم
            // این تضمین می‌کند که menus قبل از فراخوانی fetchRoleMenuOperations در دسترس است
            fetchAllMenus()
                .then(async (menus) => {
                    setAllMenus(menus); // لیست کامل منوهای فیلتر شده را در state ذخیره می‌کنیم
                    // حالا که menus را داریم، می‌توانیم fetchRoleMenuOperations را با آن فراخوانی کنیم
                    const assignedOps = await fetchRoleMenuOperations(roleId, menus); // menus اینجا فیلتر شده است
                    setSelectedMenuOperations(assignedOps);

                    // همچنین منطق expand کردن منوهای والد
                    const initialExpanded = new Set<string>();
                    Object.keys(assignedOps).forEach(menuId => {
                        let currentMenu = findMenuInTreePure(menus, menuId); // از menus فیلتر شده استفاده می‌کنیم
                        while (currentMenu) {
                            initialExpanded.add(currentMenu.id);
                            if (currentMenu.parent) { // مطمئن شوید parent.id وجود دارد
                                currentMenu = findMenuInTreePure(menus, currentMenu.parent.id); // از menus فیلتر شده استفاده می‌کنیم
                            } else {
                                break;
                            }
                        }
                    });
                    setExpandedMenus(initialExpanded);
                })
                .catch(err => {
                    console.error("Failed to load data for role permissions:", err);
                    showAlert('Datalar yüklenirken bir hata oluştu. Lütfen tekrar deneyin.', 'error');
                })
                .finally(() => {
                    setLoading(false);
                });
        } else if (!openOperationModal) {
            // ریست کردن stateها هنگام بسته شدن مودال
            setAllMenus([]);
            setSelectedMenuOperations({});
            setLoading(false);
            setSaving(false);
            setSelectedMenuId(null);
            setActiveMenu(null);
            setExpandedMenus(new Set());
        }
    }, [openOperationModal, roleId, fetchAllMenus, fetchRoleMenuOperations, showAlert]); // allMenus از dependencies حذف شد


    useEffect(() => {
        if (openOperationModal && !loading && allMenus.length > 0 && selectedMenuId === null) {
            const firstFlattenedMenu = flattenMenus(allMenus)[0];
            if (firstFlattenedMenu) {
                setSelectedMenuId(firstFlattenedMenu.id);
                setActiveMenu(firstFlattenedMenu);
            }
        }
    }, [openOperationModal, loading, allMenus, selectedMenuId, flattenMenus]);

    // ------------------------- منطق مدیریت انتخاب‌ها و وابستگی‌ها -------------------------

    // ✅ تغییر در پارامترها: اکنون آبجکت کامل MenuOperation را می‌پذییم
    const handleToggleOperation = useCallback((menuOp: MenuOperation) => {
        setSelectedMenuOperations(prev => {
            let newSelected = { ...prev };
            let currentMenuOpsIds = newSelected[activeMenu!.id] || []; // اینها الان menuOp.id ها هستند

            // برای منطق VIEW_OPERATION_ID، همچنان به systemOperation.id ها نیاز داریم.
            // باید menuOp.id های فعلی را به systemOperation.id ها map کنیم
            const currentSystemOpIds = currentMenuOpsIds.map(moId => {
                const foundMo = activeMenu?.menuOperations.find(m => m.id === moId);
                return foundMo ? foundMo.systemOperation.id : null;
            }).filter(Boolean) as string[];

            const hasViewAccess = currentSystemOpIds.includes(VIEW_OPERATION_ID);
            const isCurrentlyChecked = currentMenuOpsIds.includes(menuOp.id); // چک می‌کنیم خود menuOp.id وجود دارد یا نه

            if (isCurrentlyChecked) {
                // اگر تیک برداشته می‌شود
                if (menuOp.systemOperation.id === VIEW_OPERATION_ID) {
                    // قانون 2: اگر "مشاهده" رو تیک برداشته، همه بقیه عملیات‌های این منو و زیرمنوهایش هم باید deselect بشن
                    newSelected = removeViewAccessFromChildren(activeMenu!.id, newSelected);
                    showAlert(' "Görüntülemek" erişimi kaldırıldığı için diğer tüm operasyonlar ve alt menülerin operasyonları da kaldırıldı.', 'info');
                } else {
                    // فقط عملیات فعلی را حذف کن (با استفاده از menuOp.id)
                    newSelected[activeMenu!.id] = currentMenuOpsIds.filter(id => id !== menuOp.id);
                }
            } else {
                // اگر تیک زده می‌شود
                // قانون 1: اگر عملیات "مشاهده" انتخاب نشده و عملیات فعلی "مشاهده" نیست، اجازه انتخاب نده.
                if (menuOp.systemOperation.id !== VIEW_OPERATION_ID && !hasViewAccess) {
                    showAlert('Bu menü için "Görüntülemek" erişimi olmadan başka operasyon seçemezsiniz.', 'warning');
                    return prev;
                }
                // اگر انتخاب نشده بود، آن را اضافه کن (با استفاده از menuOp.id)
                newSelected[activeMenu!.id] = [...currentMenuOpsIds, menuOp.id];

                // ✅ اگر یک عملیات در یک زیرمنو انتخاب شد، دسترسی "مشاهده" را برای تمام والدها تا ریشه فعال کن.
                let currentTraversalMenu = findMenuInTreePure(allMenus, activeMenu!.id);
                while (currentTraversalMenu) {
                    const viewMenuOp = currentTraversalMenu.menuOperations.find(mo => mo.systemOperation.id === VIEW_OPERATION_ID);
                    if (viewMenuOp && !(newSelected[currentTraversalMenu.id] || []).includes(viewMenuOp.id)) {
                        newSelected[currentTraversalMenu.id] = [...(newSelected[currentTraversalMenu.id] || []), viewMenuOp.id];
                    }
                    if (!currentTraversalMenu.parent) break;
                    currentTraversalMenu = findMenuInTreePure(allMenus, currentTraversalMenu.parent.id);
                }
            }

            // اگر هیچ عملیاتی برای یک منو انتخاب نشده، آن کلید را از آبجکت حذف کن
            if (newSelected[activeMenu!.id] && newSelected[activeMenu!.id].length === 0) {
                delete newSelected[activeMenu!.id];
            }
            return newSelected;
        });
    }, [showAlert, removeViewAccessFromChildren, allMenus, activeMenu]); // activeMenu به dependencies اضافه شد

    const handleToggleAllActiveMenuOperations = useCallback(() => {
        if (!activeMenu) return;

        // currentMenuSelectedOps الان آرایه ای از menuOp.id هاست
        const currentMenuSelectedOps = selectedMenuOperations[activeMenu.id] || [];
        // allMenuOpIds باید آرایه ای از menuOp.id های کل عملیات های این منو باشد
        // این قسمت فقط عملیات‌هایی که recordStatus = 0 هستند را شامل می‌شود
        const allMenuOpIdsInActiveMenu = activeMenu.menuOperations.filter(op => op.recordStatus === 0).map(op => op.id);

        // برای منطق VIEW_OPERATION_ID، همچنان به systemOperation.id ها نیاز داریم.
        const currentSystemOpIds = currentMenuSelectedOps.map(moId => {
            const foundMo = activeMenu.menuOperations.find(m => m.id === moId);
            return foundMo ? foundMo.systemOperation.id : null;
        }).filter(Boolean) as string[];

        const hasViewAccess = currentSystemOpIds.includes(VIEW_OPERATION_ID);

        setSelectedMenuOperations(prev => {
            let newSelected = { ...prev };
            if (currentMenuSelectedOps.length === allMenuOpIdsInActiveMenu.length && allMenuOpIdsInActiveMenu.length > 0) {
                // اگر همه عملیات‌ها انتخاب شده بودند، حالا همه را deselect کن
                newSelected = removeViewAccessFromChildren(activeMenu.id, newSelected);
            } else {
                // اگر همه عملیات‌ها انتخاب نشده بودند، حالا همه را select کن
                if (!hasViewAccess) { // اگر VIEW_OPERATION_ID وجود ندارد
                    const viewMenuOp = activeMenu.menuOperations.find(mo => mo.systemOperation.id === VIEW_OPERATION_ID && mo.recordStatus === 0);
                    if (viewMenuOp) {
                        newSelected[activeMenu.id] = [...new Set([...allMenuOpIdsInActiveMenu, viewMenuOp.id])]; // اضافه کردن VIEW و بقیه
                        showAlert('Tüm operasyonları seçmek için önce "Görüntülemek" erişimi eklendi.', 'info');
                    } else {
                        newSelected[activeMenu.id] = allMenuOpIdsInActiveMenu; // اگر VIEW_OPERATION_ID نداریم، فقط بقیه را انتخاب کن
                    }
                } else {
                    newSelected[activeMenu.id] = allMenuOpIdsInActiveMenu; // همه را انتخاب کن
                }

                // ✅ اگر "انتخاب همه" در یک منو اعمال شد، دسترسی "مشاهده" را برای تمام والدها تا ریشه فعال کن.
                let currentTraversalMenu = findMenuInTreePure(allMenus, activeMenu.id);
                while (currentTraversalMenu) {
                    const viewMenuOp = currentTraversalMenu.menuOperations.find(mo => mo.systemOperation.id === VIEW_OPERATION_ID && mo.recordStatus === 0);
                    if (viewMenuOp && !(newSelected[currentTraversalMenu.id] || []).includes(viewMenuOp.id)) {
                        newSelected[currentTraversalMenu.id] = [...(newSelected[currentTraversalMenu.id] || []), viewMenuOp.id];
                    }
                    if (!currentTraversalMenu.parent) break;
                    currentTraversalMenu = findMenuInTreePure(allMenus, currentTraversalMenu.parent.id);
                }
            }
            return newSelected;
        });
    }, [activeMenu, selectedMenuOperations, showAlert, removeViewAccessFromChildren, allMenus]);

    const handleMenuClick = useCallback((menu: FlattenedMenu) => {
        if (menu.depth > 0 && menu.parentId) {
            const parentMenu = findMenuInTreePure(allMenus, menu.parentId);
            const viewOpForParent = parentMenu?.menuOperations.find(op => op.systemOperation.id === VIEW_OPERATION_ID && op.recordStatus === 0);

            const parentHasViewAccess = viewOpForParent ? (selectedMenuOperations[menu.parentId]?.includes(viewOpForParent.id) || false) : true;

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
        if (roleId === null) return;
        setSaving(true);
        const authToken = localStorage.getItem('authToken');
        if (!authToken) {
            showAlert('Lütfen giriş yapın.', 'warning');
            setSaving(false);
            return;
        }

        // ✅ تغییر: payload حالا آرایه‌ای از menuOp.id هاست
        const roleMenuOperationsPayload: number[] = []; // ✅ تغییر به number[]
        for (const menuIdStr in selectedMenuOperations) {
            // اطمینان حاصل کنید که فقط عملیات‌هایی که recordStatus = 0 هستند به payload اضافه شوند
            // و همچنین اطمینان حاصل کنید که منوی والد آن‌ها نیز recordStatus = 0 داشته باشد
            const menu = findMenuInTreePure(allMenus, menuIdStr);
            if (menu && menu.recordStatus === 0) {
                selectedMenuOperations[menuIdStr].forEach(menuOpId => {
                    const menuOp = menu.menuOperations.find(op => op.id === menuOpId);
                    if (menuOp && menuOp.recordStatus === 0) {
                        roleMenuOperationsPayload.push(Number(menuOpId)); // ✅ اطمینان از اینکه عدد است
                    }
                });
            }
        }
        debugger
        try {
            const response = await axios.post(
                `${server.baseurl}${server.user}assign-role-operations`,
                { roleId: Number(roleId), menueOperationIds: roleMenuOperationsPayload }, // ⭐️ payload اصلاح شد
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
        } finally {
            setSaving(false);
        }
    };


    // ------------------------- محاسبات بهینه‌شده UI با useMemo -------------------------

    const activeMenuHasViewAccess = useMemo(() => {
        if (!activeMenu) return false;
        // باید بررسی کنیم آیا menuOp.id مربوط به VIEW_OPERATION_ID در selectedMenuOperations وجود دارد
        const viewOpForActiveMenu = activeMenu.menuOperations.find(op => op.systemOperation.id === VIEW_OPERATION_ID && op.recordStatus === 0);
        if (!viewOpForActiveMenu) return false; // اگر عملیات مشاهده برای این منو وجود ندارد
        return selectedMenuOperations[activeMenu.id]?.includes(viewOpForActiveMenu.id) || false;
    }, [activeMenu, selectedMenuOperations, VIEW_OPERATION_ID]);


    const isAllOperationsChecked = useMemo(() => {
        if (!activeMenu) return false;
        const currentSelectedOps = selectedMenuOperations[activeMenu.id] || []; // اینها menuOp.id ها هستند
        const allOpsInActiveMenu = activeMenu.menuOperations.filter(op => op.recordStatus === 0).map(op => op.id);
        return currentSelectedOps.length === allOpsInActiveMenu.length && allOpsInActiveMenu.length > 0;
    }, [activeMenu, selectedMenuOperations]);

    const isAllOperationsIndeterminate = useMemo(() => {
        if (!activeMenu) return false;
        const currentSelectedOps = selectedMenuOperations[activeMenu.id] || []; // اینها menuOp.id ها هستند
        const availableOperations = activeMenu.menuOperations.filter(op => op.recordStatus === 0);
        return currentSelectedOps.length > 0 && currentSelectedOps.length < availableOperations.length;
    }, [activeMenu, selectedMenuOperations]);


    // ------------------------- ساختار رندر (Render Structure) -------------------------

    return (
        <Dialog fullScreen open={openOperationModal} onClose={onClose} TransitionComponent={Transition}>
            <AppBar sx={{ position: 'relative' }}>
                <Toolbar>
                    <CustomTooltip title={isTooltipGloballyEnabled ? "Kapat" : ""}>
                        <IconButton edge="start" color="inherit" onClick={onClose} aria-label="close">
                            <IconX width={24} height={24} />
                        </IconButton>
                    </CustomTooltip>
                    <Typography ml={2} flex={1} variant="h6" component="div">
                        Rol için Menü ve Operasyonları Seçin
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
                        {/* کادر سمت راست: لیست منوها */}
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
                                        // ✅ allMenus اینجا از قبل فیلتر شده است
                                        allMenus.sort((a, b) => a.order - b.order).map((menu) => (
                                            <MenuItemRenderer
                                                key={menu.id}
                                                // نیازی به فیلتر کردن مجدد childMenus نیست چون filterMenusByRecordStatus این کار را انجام می‌دهد
                                                menu={{ ...menu, menus: menu.menus, level: 0, parentId: null }}
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

                        {/* کادر سمت چپ: عملیات‌های منوی انتخاب شده */}
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

                                            {/* عملیات‌های منوی فعال را فیلتر می‌کنیم */}
                                            {activeMenu.menuOperations
                                                .filter(menuOp => menuOp.recordStatus === 0) // <--- اضافه کردن این فیلتر
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
                                                                        checked={selectedMenuOperations[activeMenu.id]?.includes(menuOp.id) || false}
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

export default ListSystemOperationModal;