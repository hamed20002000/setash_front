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

const Search = () => {
  const [showDrawer2, setShowDrawer2] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [allDynamicMenus, setAllDynamicMenus] = useState<MenuitemsType[]>([]);
  const [loadingMenus, setLoadingMenus] = useState(false);

  const loadMenus = useCallback(async () => {
    setLoadingMenus(true);
    try {
      const menus = await getDynamicMenuItems();
      setAllDynamicMenus(menus);
    } catch (error) {
      console.error("Error loading dynamic menus for search:", error);
    } finally {
      setLoadingMenus(false);
    }
  }, []);

  useEffect(() => {
    if (showDrawer2 && allDynamicMenus.length === 0 && !loadingMenus) {
      loadMenus();
    }
  }, [showDrawer2, allDynamicMenus.length, loadingMenus, loadMenus]);

  const handleDrawerClose2 = () => {
    setShowDrawer2(false);
    setSearchTerm('');
  };

  // ✅ تابع بازگشتی اصلاح شده برای فیلتر کردن منوها در تمام سطوح بر اساس searchTerm
  const filterRoutes = useCallback((items: MenuitemsType[], currentSearchTerm: string): MenuitemsType[] => {
    const results: MenuitemsType[] = [];
    if (!currentSearchTerm) return [];

    const lowerCaseSearchTerm = currentSearchTerm.toLocaleLowerCase();

    items.forEach((item) => {
      // ✅ نیازی به چک کردن recordStatus=0 در اینجا نیست، چون getDynamicMenuItems از قبل این کار رو کرده.
      // بررسی می‌کنیم که آیا عنوان آیتم فعلی با عبارت جستجو مطابقت دارد
      const currentItemMatches = item.title && item.title.toLocaleLowerCase().includes(lowerCaseSearchTerm);

      // اگر آیتم فرزندان دارد، به صورت بازگشتی روی فرزندان جستجو کنید
      const childrenResults: MenuitemsType[] = [];
      if (item.children && item.children.length > 0) {
        // ✅ children از قبل فیلتر شده‌اند (recordStatus=0)
        const filteredChildren = item.children; // از قبل فیلتر شده
        childrenResults.push(...filterRoutes(filteredChildren, currentSearchTerm));
      }

      // ✅ منطق جدید:
      // 1. اگر خود آیتم با عبارت جستجو مطابقت دارد، آن را اضافه کنید.
      // 2. اگر خود آیتم مطابقت ندارد ولی یکی از فرزندانش (که در childrenResults آمده) مطابقت دارد،
      //    شما می توانید انتخاب کنید که والد را نیز به عنوان یک آیتم قابل نمایش اضافه کنید (برای حفظ ساختار سلسله مراتبی در نتایج)
      //    در این مثال، اگر والد خودش لینک داشته باشد، اضافه می شود. در غیر اینصورت، فقط نتایج فرزندان.
      //    اگر می‌خواهید والد بدون لینک هم نمایش داده شود، می‌توانید این منطق را تغییر دهید.
      if (currentItemMatches) {
        results.push(item);
      } else if (childrenResults.length > 0) {
        // اگر فرزندان مطابقت دارند، و آیتم والد خودش href ندارد، اما یک گروه والد است
        // می‌توانید یک نسخه ساده از والد را به نتایج اضافه کنید تا مسیر نمایش داده شود.
        // اگر آیتم والد خودش یک لینک است و جستجو به زیرمجموعه اش رسیده، می تونید انتخاب کنید والد هم نشون داده بشه.
        // اما بهترین راه اینه که فقط آیتم‌های قابل کلیک (دارای href) نمایش داده بشن.
        // پس فقط فرزندان منطبق رو اضافه می کنیم، و شرط href در map پایین اعمال میشه.
        results.push(...childrenResults);
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
                  // ✅ اینجا فقط آیتم‌هایی را نمایش می‌دهیم که href دارند
                  searchResults.map((menu: MenuitemsType) => (
                    menu.href ? (
                      <ListItemButton
                        sx={{ py: 0.5, px: 1 }}
                        to={menu.href}
                        component={Link}
                        key={menu.id || menu.title}
                        onClick={handleDrawerClose2}
                      >
                        <ListItemText
                          primary={menu.title}
                          secondary={menu.href}
                          sx={{ my: 0, py: 0.5 }}
                        />
                      </ListItemButton>
                    ) : null
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