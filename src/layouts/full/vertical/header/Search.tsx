import { useState } from 'react';
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
} from '@mui/material';
import { IconSearch, IconX } from '@tabler/icons-react';
import Menuitems from '../sidebar/MenuItems';
import { Link } from 'react-router-dom';

// اینترفیس MenuitemsType را از فایل MenuItems.tsx اینجا هم import کنید یا دوباره تعریف کنید.
// بهتر است که اینترفیس را در یک فایل جداگانه (مثلاً types/index.ts) تعریف کرده و در هر دو جا import کنید.
// فعلا برای سادگی، آن را اینجا کپی می‌کنیم:
interface MenuitemsType {
  id?: string;
  navlabel?: boolean;
  subheader?: string; // این حالا برای آیتم‌های اصلی که صرفاً یک هدینگ هستند استفاده می‌شود
  title?: string; // عنوان آیتم منو یا والد
  icon?: any;
  href?: string;
  children?: MenuitemsType[]; // آرایه‌ای از زیرمجموعه‌ها
  chip?: string;
  chipColor?: string;
  variant?: string;
  external?: boolean;
}

const Search = () => {
  const [showDrawer2, setShowDrawer2] = useState(false);
  const [searchTerm, setSearchTerm] = useState(''); // تغییر نام state به searchTerm برای وضوح بیشتر

  const handleDrawerClose2 = () => {
    setShowDrawer2(false);
  };

  // تابع بازگشتی برای فیلتر کردن منوها در تمام سطوح
  const filterRoutes = (items: MenuitemsType[], searchTerm: string): MenuitemsType[] => {
    if (!searchTerm) return []; // اگر جستجویی نیست، لیست خالی برگردان
    
    const results: MenuitemsType[] = [];
    const lowerCaseSearchTerm = searchTerm.toLocaleLowerCase();

    items.forEach((item) => {
      // اگر آیتم والد دارای عنوان است و با عبارت جستجو مطابقت دارد
      if (item.title && item.title.toLocaleLowerCase().includes(lowerCaseSearchTerm)) {
        // اگر این آیتم یک والد با children باشد، فقط والد را اضافه کنید و اجازه دهید کاربر آن را باز کند
        // اگر هم یک آیتم ساده است، آن را اضافه کنید.
        results.push(item);
      } else if (item.children && item.children.length > 0) {
        // اگر آیتم فرزندان دارد، به صورت بازگشتی روی فرزندان جستجو کنید
        const childrenResults = filterRoutes(item.children, searchTerm);
        // اگر هر یک از فرزندان مطابقت داشتند، آنها را به نتایج اضافه کنید
        // شما می‌توانید انتخاب کنید که والد را هم در این حالت اضافه کنید یا فقط فرزندان را.
        // در این مثال، ما فقط فرزندانی که مطابقت دارند را اضافه می‌کنیم.
        results.push(...childrenResults);
      }
      // اگر آیتم یک subheader قدیمی است (اگر هنوز در Menuitems دارید)، آن را نادیده بگیرید
      // مگر اینکه بخواهید subheader ها خودشان قابل جستجو باشند.
      // با ساختار جدید، اکثر subheader ها تبدیل به title+children شده‌اند.
    });

    return results;
  };

  // هر بار که searchTerm تغییر می کند، جستجو را انجام دهید
  const searchResults = filterRoutes(Menuitems, searchTerm);

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
        onClose={() => setShowDrawer2(false)}
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
              onChange={(e) => setSearchTerm(e.target.value)} // تغییر به setSearchTerm
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
            <List component="nav">
              {searchResults.length > 0 ? (
                searchResults.map((menu: MenuitemsType) => ( // تغییر نام به menu و استفاده از MenuitemsType
                  // اینجا باید تصمیم بگیرید که آیتم‌های والد را هم نمایش دهید یا فقط برگ‌ها (leaf nodes)
                  // این کد فقط آیتم‌هایی را که href دارند و در نتیجه قابل کلیک هستند نمایش می‌دهد
                  // و آیتم‌هایی که children دارند را به عنوان لینک مستقیم نمایش نمی‌دهد
                  // مگر اینکه خود والد هم href داشته باشد.
                  // منطق ساده شده برای نمایش هر آیتمی که پیدا شده و href دارد:
                  menu.href ? ( // اگر آیتم خودش href دارد، نمایش بده
                    <ListItemButton
                      sx={{ py: 0.5, px: 1 }}
                      to={menu.href}
                      component={Link}
                      key={menu.id || menu.title} // استفاده از id یا title به عنوان key
                      onClick={handleDrawerClose2} // بستن دیالوگ پس از کلیک
                    >
                      <ListItemText
                        primary={menu.title}
                        secondary={menu.href}
                        sx={{ my: 0, py: 0.5 }}
                      />
                    </ListItemButton>
                  ) : null // اگر href ندارد (مثل والد بدون href)، فعلاً نمایش نده
                ))
              ) : (
                <Typography variant="body2" color="textSecondary" align="center" mt={2}>
                  Hiçbir sonuç bulunamadı.
                </Typography>
              )}
            </List>
          </Box>
        </Box>
      </Dialog>
    </>
  );
};

export default Search;