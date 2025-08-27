import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  IconButton,
  Dialog,
  DialogContent,
  Stack,
  Divider,
  Box,
  List,
  ListItemText,
  Typography,
  TextField,
  ListItemButton,
  CircularProgress
} from '@mui/material';
import { IconSearch, IconX } from '@tabler/icons-react';
import { Link } from 'react-router-dom';
import { getDynamicMenuItems, MenuitemsType } from '../../vertical/sidebar/MenuItems';
import { useAuth } from 'src/context/AuthContext';

const Search = () => {
  const [showDrawer2, setShowDrawer2] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [allDynamicMenus, setAllDynamicMenus] = useState<MenuitemsType[]>([]);
  const [loadingMenus, setLoadingMenus] = useState(false);
  const { allowedOperations } = useAuth();

  const loadMenus = useCallback(async () => {
    setLoadingMenus(true);
    try {
      const operationNames = allowedOperations?.map(op => op.systemOperationName) || [];

      const menus = await getDynamicMenuItems(operationNames);

      setAllDynamicMenus(menus);
    } catch (error) {
      console.error("Error loading dynamic menus for search:", error);
    } finally {
      setLoadingMenus(false);
    }
  }, [allowedOperations]);

  useEffect(() => {
    if (showDrawer2 && allDynamicMenus.length === 0 && !loadingMenus) {
      loadMenus();
    }
    // اگر دیالوگ بسته شد، ترم جستجو را پاک کنید و نتایج را ریست کنید
    if (!showDrawer2) {
      setSearchTerm('');
      // allDynamicMenus را لازم نیست خالی کنید، چون ممکن است دوباره باز شود.
    }
  }, [showDrawer2, allDynamicMenus.length, loadingMenus, loadMenus]);

  const handleDrawerClose2 = () => {
    setShowDrawer2(false);
    setSearchTerm(''); // پاک کردن عبارت جستجو هنگام بستن دیالوگ
  };

  // ✅ تابع بازگشتی اصلاح شده برای فیلتر کردن منوها در تمام سطوح بر اساس searchTerm
  const filterRoutes = useCallback((items: MenuitemsType[], currentSearchTerm: string): MenuitemsType[] => {
    const results: MenuitemsType[] = [];
    if (!currentSearchTerm) return [];

    const lowerCaseSearchTerm = currentSearchTerm.toLocaleLowerCase();

    items.forEach((item) => {
      // بررسی می‌کنیم که آیا عنوان آیتم فعلی با عبارت جستجو مطابقت دارد
      const currentItemMatches = item.title && item.title.toLocaleLowerCase().includes(lowerCaseSearchTerm);

      // اگر آیتم فرزندان دارد، به صورت بازگشتی روی فرزندان جستجو کنید
      const childrenResults: MenuitemsType[] = [];
      if (item.children && item.children.length > 0) {
        // children از قبل در getDynamicMenuItems فیلتر شده‌اند (recordStatus=0)
        childrenResults.push(...filterRoutes(item.children, currentSearchTerm));
      }

      // ✅ منطق اصلی:
      // 1. اگر خود آیتم با عبارت جستجو مطابقت دارد، آن را اضافه کنید.
      // 2. اگر آیتم خودش مطابقت ندارد، اما فرزندان مطابقت‌یافته‌ای دارد:
      //    یک کپی از والد را با فرزندان فیلتر شده ایجاد کرده و اضافه کنید.
      //    این کار به حفظ ساختار سلسله مراتبی در نتایج کمک می‌کند.
      if (currentItemMatches) {
        results.push(item);
      } else if (childrenResults.length > 0) {
        // ✅ اگر والد خودش مطابقت ندارد ولی فرزندانش مطابقت دارند،
        // والد را با فرزندان فیلتر شده‌اش اضافه کنید.
        // این تضمین می‌کند که مسیر کامل به آیتم‌های یافت شده دیده شود.
        results.push({
          ...item,
          children: childrenResults, // فقط فرزندان مطابقت‌یافته را نگه می‌داریم
        });
      }
    });

    return results;
  }, []);

  const searchResults = useMemo(() => {
    return filterRoutes(allDynamicMenus, searchTerm);
  }, [allDynamicMenus, searchTerm, filterRoutes]);

  return (
    <>
      <IconButton
        aria-label="show search dialog"
        color="inherit"
        aria-controls="search-menu"
        aria-haspopup="true"
        onClick={() => setShowDrawer2(true)}
        size="large"
      >
        <IconSearch size="16" />
      </IconButton>
      <Dialog
        open={showDrawer2}
        onClose={handleDrawerClose2}
        fullWidth
        maxWidth={'sm'}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
        PaperProps={{ sx: { position: 'fixed', top: 30, m: 0 } }}
      >
        <DialogContent className="testdialog">
          <Stack direction="row" spacing={2} alignItems="center">
            <TextField
              id="tb-search"
              placeholder="Burada ara"
              fullWidth
              onChange={(e) => setSearchTerm(e.target.value)}
              value={searchTerm}
              inputProps={{ 'aria-label': 'Search here' }}
            />
            <IconButton size="small" onClick={handleDrawerClose2}>
              <IconX size="18" />
            </IconButton>
          </Stack>
        </DialogContent>
        <Divider />
        <Box p={2} sx={{ maxHeight: '60vh', overflow: 'auto' }}>
          <Typography variant="h5" p={1}>
            Hızlı Sayfa Bağlantıları
          </Typography>
          <Box>
            {loadingMenus ? (
              <Box display="flex" justifyContent="center" alignItems="center" height="100px">
                <CircularProgress size={20} />
                <Typography ml={1}>Menüler yükleniyor...</Typography>
              </Box>
            ) : (
              <List component="nav">
                {searchResults.length > 0 ? (
                  searchResults.map((menu: MenuitemsType) => (
                    // ✅ نمایش آیتم‌ها به صورت سلسله مراتبی (والد و فرزندان)
                    // این تابع کمکی برای رندر کردن آیتم‌های درختی است.
                    <RenderSearchResultItem key={menu.id || menu.title} item={menu} onClose={handleDrawerClose2} />
                  ))
                ) : (
                  <Typography variant="body2" color="textSecondary" align="center" mt={2}>
                    {searchTerm ? 'Hiçbir sonuç bulunamadı.' : 'Lütfen aramak için yazmaya başlayın.'}
                  </Typography>
                )}
              </List>
            )}
          </Box>
        </Box>
      </Dialog>
    </>
  );
};

export default Search;


// ✅ کامپوننت کمکی جدید برای رندر کردن نتایج جستجوی سلسله مراتبی
interface RenderSearchResultItemProps {
  item: MenuitemsType;
  onClose: () => void;
  level?: number; // برای تو رفتگی (indentation)
}

const RenderSearchResultItem: React.FC<RenderSearchResultItemProps> = ({ item, onClose, level = 0 }) => {
  // اگر آیتم خودش href دارد، قابل کلیک است
  const isClickable = !!item.href;

  return (
    <>
      <ListItemButton
        sx={{
          py: 0.5,
          px: 1,
          paddingLeft: `${level * 20 + 8}px`, // برای تو رفتگی
          fontWeight: item.children && item.children.length > 0 ? 'bold' : 'normal', // والدین پررنگ‌تر
          pointerEvents: isClickable ? 'auto' : 'none', // فقط آیتم‌های دارای لینک قابل کلیک باشند
          opacity: isClickable ? 1 : 0.7, // آیتم‌های غیرقابل کلیک کمی کم‌رنگ‌تر باشند
          // اگر آیتم والد است و href ندارد، پس خودش نباید لینک باشد
          // اما اگر فرزندانش نمایش داده می شوند، آن را به عنوان یک "سرگروه" بصری نمایش می دهیم.
        }}
        // اگر آیتم قابل کلیک است، آن را به عنوان Link کامپوننت رندر کن
        component={isClickable ? Link : 'div'}
        to={isClickable ? item.href : undefined}
        onClick={isClickable ? onClose : undefined}
        disabled={!isClickable} // اگر قابل کلیک نیست، disable باشد
      >
        <ListItemText
          primary={item.title}
          secondary={isClickable ? item.href : undefined}
          primaryTypographyProps={{ variant: 'body2', noWrap: true }}
          sx={{ my: 0, py: 0.5 }}
        />
      </ListItemButton>

      {/* رندر کردن فرزندان (اگر وجود دارند) */}
      {item.children && item.children.length > 0 && (
        <List component="div" disablePadding>
          {item.children.map(child => (
            <RenderSearchResultItem
              key={child.id || child.title}
              item={child}
              onClose={onClose}
              level={level + 1}
            />
          ))}
        </List>
      )}
    </>
  );
};