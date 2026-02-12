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
    if (!showDrawer2) {
      setSearchTerm('');
    }
  }, [showDrawer2, allDynamicMenus.length, loadingMenus, loadMenus]);

  const handleDrawerClose2 = () => {
    setShowDrawer2(false);
    setSearchTerm('');
  };

  const filterRoutes = useCallback((items: MenuitemsType[], currentSearchTerm: string): MenuitemsType[] => {
    const results: MenuitemsType[] = [];
    if (!currentSearchTerm) return [];

    const lowerCaseSearchTerm = currentSearchTerm.toLocaleLowerCase();

    items.forEach((item) => {
      const currentItemMatches = item.title && item.title.toLocaleLowerCase().includes(lowerCaseSearchTerm);

      const childrenResults: MenuitemsType[] = [];
      if (item.children && item.children.length > 0) {
        childrenResults.push(...filterRoutes(item.children, currentSearchTerm));
      }

      if (currentItemMatches) {
        results.push(item);
      } else if (childrenResults.length > 0) {
        results.push({
          ...item,
          children: childrenResults,
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


interface RenderSearchResultItemProps {
  item: MenuitemsType;
  onClose: () => void;
  level?: number;
}

const RenderSearchResultItem: React.FC<RenderSearchResultItemProps> = ({ item, onClose, level = 0 }) => {

  const isClickable = !!item.href;

  return (
    <>
      <ListItemButton
        sx={{
          py: 0.5,
          px: 1,
          paddingLeft: `${level * 20 + 8}px`,
          fontWeight: item.children && item.children.length > 0 ? 'bold' : 'normal',
          pointerEvents: isClickable ? 'auto' : 'none',
          opacity: isClickable ? 1 : 0.7,
        }}
        component={isClickable ? Link : 'div'}
        to={isClickable ? item.href : undefined}
        onClick={isClickable ? onClose : undefined}
        disabled={!isClickable}
      >
        <ListItemText
          primary={item.title}
          secondary={isClickable ? item.href : undefined}
          primaryTypographyProps={{ variant: 'body2', noWrap: true }}
          sx={{ my: 0, py: 0.5 }}
        />
      </ListItemButton>

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