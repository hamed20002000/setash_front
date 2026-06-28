import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Typography,
  Grid,
  Button,
  Alert,
  Stack,
  CircularProgress,
  FormControl,
  RadioGroup,
  FormControlLabel,
  Radio,
  Select,
  MenuItem as MuiMenuItem,
  Checkbox,
  FormGroup,
  Card,
  CardContent,
  Divider,
} from '@mui/material';
import { styled } from '@mui/material/styles';
import BoltIcon from '@mui/icons-material/Bolt';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import HighlightOffIcon from '@mui/icons-material/HighlightOff';

import BlankCard from '../../../components/shared/BlankCard';
import CustomFormLabel from '../../../components/forms/theme-elements/CustomFormLabel';
import axios from 'axios';
import server from '../../../assets/address.json';
import { useTooltip, CustomTooltip } from 'src/context/TooltipContext';

const DEFAULT_IMAGE_URL = "";

// استایل‌های سفارشی مشابه نمونه تصویر برای نمایش وضعیت تیک‌های ثابت نقش
const StatusBadge = styled(Box)<{ isSuccess: boolean }>(({ theme, isSuccess }) => ({
  display: 'inline-flex',
  alignItems: 'center',
  padding: '4px 12px',
  borderRadius: '20px',
  border: `1px solid ${isSuccess ? '#26e7a6' : '#ff8c6b'}`,
  color: isSuccess ? '#00c48c' : '#ff6a42',
  backgroundColor: 'transparent',
  fontWeight: '600',
  fontSize: '0.85rem',
  gap: '6px',
  margin: '4px'
}));

interface RoleType {
  id: number;
  name: string;
  recordStatus?: number;
  status: string;
}

interface UserRoleType {
  id: string;
  name: string;
  recordStatus?: number;
}

interface UserType {
  id: string;
  username: string;
  email: string;
  roles: UserRoleType[];
}

interface NotificationType {
  id: string;
  name: string;
}

export default function ListNotif() {
  const navigate = useNavigate();
  const { isTooltipGloballyEnabled } = useTooltip();

  // States برای اطلاعات اصلی
  const [targetType, setTargetType] = useState<'role' | 'user'>('role');
  const [selectedRoleId, setSelectedRoleId] = useState<number | ''>('');
  const [selectedUserId, setSelectedUserId] = useState<string | ''>('');

  // لیست داده‌های دریافتی از سرور
  const [rolesList, setRolesList] = useState<RoleType[]>([]);
  const [usersList, setUsersList] = useState<UserType[]>([]);
  const [notifications, setNotifications] = useState<NotificationType[]>([]);

  // نوتیفیکیشن‌های تیک‌خورده دستی (توسط اپراتور)
  const [selectedNotifIds, setSelectedNotifIds] = useState<string[]>([]);

  // وضعیت‌های سیستم
  const [loadingData, setLoadingData] = useState<boolean>(true);
  const [loadingButton, setLoadingButton] = useState<boolean>(false);
  const [alertMessage, setAlertMessage] = useState<string | null>(null);
  const [alertSeverity, setAlertSeverity] = useState<'success' | 'error' | 'warning' | 'info'>('info');

  const showAlert = useCallback((message: string, severity: 'success' | 'error' | 'warning' | 'info') => {
    setAlertMessage(message);
    setAlertSeverity(severity);
  }, []);

  const clearAlert = useCallback(() => {
    setAlertMessage(null);
  }, []);

  // ۱. دریافت لیست نقش‌ها
  const getListRole = useCallback(() => {
    const authToken = localStorage.getItem('authToken');
    if (!authToken) return navigate("/");

    axios.request({
      baseURL: server.baseurl + server.user + "get-roles",
      method: "get",
      headers: { "Accept": "application/json", "Authorization": `Bearer ${authToken}` }
    }).then((result) => {
      if (result.data.httpStatusCode === 200) {
        const formattedData = result.data.data.map((item: any) => ({
          id: item.id,
          name: item.name,
          status: item.recordStatus === 0 ? 'Aktif' : 'Pasif',
        }));
        setRolesList(formattedData);
      }
    }).catch((e) => {
      console.error(e);
    });
  }, [navigate]);

  // ۲. دریافت لیست کاربران
  const getListUsers = useCallback(() => {
    const authToken = localStorage.getItem('authToken');
    if (!authToken) return navigate("/");

    axios.get(server.baseurl + server.user + "get-users", {
      headers: { "Accept": "application/json", "Authorization": `Bearer ${authToken}` }
    }).then((result) => {
      if (result.data.httpStatusCode === 200) {
        const formattedData = result.data.data.map((item: any) => ({
          id: String(item.id),
          username: item.username,
          email: item.email,
          roles: (item.roles || []).map((role: any) => ({
            id: String(role.id),
            name: role.name,
          })),
        }));
        setUsersList(formattedData);
      }
    }).catch((e) => {
      console.error(e);
    });
  }, [navigate]);

  // ۳. دریافت تمام لیست نوتیفیکیشن‌ها
  const getNotificationLists = useCallback(() => {
    const authToken = localStorage.getItem('authToken');
    if (!authToken) return navigate("/");

    axios.get(server.baseurl + server.user + "get-notification-lists", {
      headers: { "Accept": "application/json", "Authorization": `Bearer ${authToken}` }
    }).then((result) => {
      if (result.data.httpStatusCode === 200 || result.data.success) {
        setNotifications(result.data.data);
      } else {
        showAlert('Bildirim listesi alınamadı.', 'error');
      }
    }).catch((e) => {
      console.error(e);
      showAlert('Bildirim listesi alınırken hata oluştu.', 'error');
    });
  }, [navigate, showAlert]);

  // اجرای اولیه بارگذاری کل داده‌ها
  useEffect(() => {
    setLoadingData(true);
    Promise.all([getListRole(), getListUsers(), getNotificationLists()]).then(() => {
      setLoadingData(false);
    }).catch(() => setLoadingData(false));
  }, [getListRole, getListUsers, getNotificationLists]);

  // ۴. شبیه‌سازی دریافت نوتیفیکیشن‌های ذخیره شده متناسب با تغییر کامبو باکس‌ها (Mock Get Data)
  useEffect(() => {
    setSelectedNotifIds([]); // ریست کردن تیک‌ها هنگام تغییر المان سلکت شده
    
    if (targetType === 'role' && selectedRoleId !== '') {
      // اینجا در آینده API گت مربوط به نقش صدا زده می‌شود. فعلا فرضی چند مورد تیک می‌خورد:
      setSelectedNotifIds(["1", "3", "5"]);
    } 
    else if (targetType === 'user' && selectedUserId !== '') {
      // فرضی: نوتیفیکیشن‌های اختصاصی که قبلا مستقیم به خود یوزر داده شده
      setSelectedNotifIds(["2", "5", "9"]);
    }
  }, [targetType, selectedRoleId, selectedUserId]);

  // پیدا کردن یوزر انتخاب شده جهت استخراج نقش‌های او برای بخش تیک‌های ثابت ارث‌رسیده
  const currentSelectedUser = useMemo(() => {
    if (targetType !== 'user' || !selectedUserId) return null;
    return usersList.find(u => u.id === selectedUserId) || null;
  }, [targetType, selectedUserId, usersList]);

  // متد فرضی کاملا داینامیک: بررسی اینکه آیا این نوتیفیکیشن در نقش‌های کاربر فعال است یا خیر
  // (چون دیتای لایه رول‌ها در یوزر فعلا در دسترس نیست، متد شبیه‌ساز است)
  const isNotificationAssignedToRole = useCallback((notifId: string) => {
    if (!currentSelectedUser) return false;
    // فرض می‌کنیم اگر کاربر نقش خاصی داشت، ایدی‌های فرد نوتیفیکیشن به رولش وصل هستن
    if (currentSelectedUser.roles.length > 0) {
      return ["1", "4", "7", "12"].includes(notifId); 
    }
    return false;
  }, [currentSelectedUser]);

  // هندلر تیک زدن چک‌باکس‌ها
  const handleCheckboxChange = (notifId: string, checked: boolean) => {
    if (checked) {
      setSelectedNotifIds(prev => [...prev, notifId]);
    } else {
      setSelectedNotifIds(prev => prev.filter(id => id !== notifId));
    }
  };

  // ۵. سابمیت و دکمه ثبت نهایی فرم به تفکیک رول و یوزر
  const handleSaveConfig = async () => {
    clearAlert();
    const authToken = localStorage.getItem('authToken');
    if (!authToken) return navigate("/");

    if (targetType === 'role' && selectedRoleId === '') {
      showAlert('Lütfen bir rol seçiniz.', 'warning');
      return;
    }
    if (targetType === 'user' && selectedUserId === '') {
      showAlert('Lütfen bir kullanıcı seçiniz.', 'warning');
      return;
    }

    setLoadingButton(true);

    try {
      if (targetType === 'role') {
        const payload = {
          roleId: Number(selectedRoleId),
          notificationListIds: selectedNotifIds,
          assign: true
        };
        const response = await axios.post(server.baseurl + server.user + "set-role-notification-lists", payload, {
          headers: { "Accept": "application/json", "Content-Type": "application/json", "Authorization": `Bearer ${authToken}` }
        });
        if (response.data.httpStatusCode === 200 || response.data.success) {
          showAlert('Rol bildirim listesi başarıyla güncellendi.', 'success');
        }
      } else {
        const payload = {
          userId: String(selectedUserId),
          notificationListIds: selectedNotifIds,
          assign: true
        };
        const response = await axios.post(server.baseurl + server.user + "set-user-notification-lists", payload, {
          headers: { "Accept": "application/json", "Content-Type": "application/json", "Authorization": `Bearer ${authToken}` }
        });
        if (response.data.httpStatusCode === 200 || response.data.success) {
          showAlert('Kullanıcı bildirim listesi başarıyla güncellendi.', 'success');
        }
      }
    } catch (error: any) {
      console.error(error);
      showAlert(error.response?.data?.message || 'İşlem gerçekleştirilirken bir hata oluştu.', 'error');
    } finally {
      setLoadingButton(false);
    }
  };

  if (loadingData) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="300px">
        <CircularProgress />
        <Typography variant="h6" sx={{ ml: 2 }}>Veriler Yükleniyor...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 1 }}>
      <BlankCard>
        <Box sx={{ padding: '20px 25px' }}>
          <Typography variant="h5" mb={3}>Bildirim Listesi Yönetimi</Typography>
          
          <Grid container spacing={3} alignItems="center">
            {/* انتخاب نوع فیلتر با رادیو باتن */}
            <Grid item xs={12} md={3}>
              <FormControl component="fieldset">
                <RadioGroup
                  row
                  value={targetType}
                  onChange={(e) => setTargetType(e.target.value as 'role' | 'user')}
                >
                  <FormControlLabel value="role" control={<Radio color="primary" />} label="Role Göre" />
                  <FormControlLabel value="user" control={<Radio color="primary" />} label="Kullanıcıya Göre" />
                </RadioGroup>
              </FormControl>
            </Grid>

            {/* کمبو باکس رول ها */}
            <Grid item xs={12} sm={6} md={4}>
              <Stack direction="row" spacing={1} alignItems="center">
                <CustomFormLabel sx={{ minWidth: '70px', mt: 0 }}>Roller:</CustomFormLabel>
                <Select
                  fullWidth
                  disabled={targetType !== 'role'}
                  value={selectedRoleId}
                  onChange={(e) => setSelectedRoleId(e.target.value as number)}
                  displayEmpty
                >
                  <MuiMenuItem value="" disabled>Rol Seçiniz</MuiMenuItem>
                  {rolesList.map((role) => (
                    <MuiMenuItem key={role.id} value={role.id}>{role.name}</MuiMenuItem>
                  ))}
                </Select>
              </Stack>
            </Grid>

            {/* کمبو باکس یوزر ها */}
            <Grid item xs={12} sm={6} md={4}>
              <Stack direction="row" spacing={1} alignItems="center">
                <CustomFormLabel sx={{ minWidth: '80px', mt: 0 }}>Kullanıcılar:</CustomFormLabel>
                <Select
                  fullWidth
                  disabled={targetType !== 'user'}
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value as string)}
                  displayEmpty
                >
                  <MuiMenuItem value="" disabled>Kullanıcı Seçiniz</MuiMenuItem>
                  {usersList.map((user) => (
                    <MuiMenuItem key={user.id} value={user.id}>{user.username}</MuiMenuItem>
                  ))}
                </Select>
              </Stack>
            </Grid>
          </Grid>
        </Box>
      </BlankCard>

      {/* نمایش لیست اصلی نوتیفیکیشن‌ها متناسب با انتخاب رادیو باتن */}
      <Box mt={4}>
        {targetType === 'role' ? (
          // حالت اول: اگر رول انتخاب شد (یک ستون یا ساختار فلت چک باکس دار)
          <Card variant="outlined">
            <CardContent>
              <Typography variant="h6" mb={2} color="primary.main">Rol Bildirim İzinleri</Typography>
              <Divider sx={{ mb: 2 }} />
              <FormGroup>
                <Grid container spacing={2}>
                  {notifications.map((notif) => (
                    <Grid item xs={12} sm={6} md={4} key={notif.id}>
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={selectedNotifIds.includes(notif.id)}
                            onChange={(e) => handleCheckboxChange(notif.id, e.target.checked)}
                            disabled={selectedRoleId === ''}
                          />
                        }
                        label={notif.name}
                      />
                    </Grid>
                  ))}
                </Grid>
              </FormGroup>
            </CardContent>
          </Card>
        ) : (
          // حالت دوم: اگر یوزر انتخاب شد (دو ستونه بر اساس عکس وضعیت و دسترسی‌های ارث بری)
          <Grid container spacing={3}>
            {/* ستون سمت چپ: نقش ارث‌رسیده از رول کاربر (غیرقابل ادیت - Badge Style مشابه تصویر ارسالی) */}
            <Grid item xs={12} md={6}>
              <Card variant="outlined" sx={{ height: '100%', minHeight: '250px' }}>
                <CardContent>
                  <Typography variant="h6" mb={1} color="success.main">Rolden Gelen Sabit İzinler (Sol Sütun)</Typography>
                  <Typography variant="caption" color="textSecondary" display="block" mb={2}>
                    Bu izinler kullanıcının bağlı olduğu rolden otomatik atanmıştır ve değiştirilemez.
                  </Typography>
                  <Divider sx={{ mb: 2 }} />
                  
                  <Box display="flex" flexWrap="wrap" gap={1}>
                    {notifications.map((notif) => {
                      const hasRolePermission = isNotificationAssignedToRole(notif.id);
                      return (
                        <Box key={notif.id} sx={{ display: 'flex', alignItems: 'center' }}>
                          {hasRolePermission ? (
                            <StatusBadge isSuccess={true}>
                              <CheckCircleOutlineIcon fontSize="small" />
                              {notif.name}
                            </StatusBadge>
                          ) : (
                            <StatusBadge isSuccess={false}>
                              <HighlightOffIcon fontSize="small" />
                              {notif.name}
                            </StatusBadge>
                          )}
                        </Box>
                      );
                    })}
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            {/* ستون سمت راست: شخصی سازی‌های مخصوص خودِ کاربر (قابل تیک زدن و تغییر) */}
            <Grid item xs={12} md={6}>
              <Card variant="outlined" sx={{ height: '100%', minHeight: '250px' }}>
                <CardContent>
                  <Typography variant="h6" mb={1} color="info.main">Kullanıcıya Özel Ek İzinler (Sağ Sütun)</Typography>
                  <Typography variant="caption" color="textSecondary" display="block" mb={2}>
                    Kullanıcıya özel olarak tanımlamak istediğiniz ek bildirimleri buradan işaretleyebilirsiniz.
                  </Typography>
                  <Divider sx={{ mb: 2 }} />
                  
                  <FormGroup>
                    <Grid container spacing={2}>
                      {notifications.map((notif) => (
                        <Grid item xs={12} sm={6} key={notif.id}>
                          <FormControlLabel
                            control={
                              <Checkbox
                                checked={selectedNotifIds.includes(notif.id)}
                                onChange={(e) => handleCheckboxChange(notif.id, e.target.checked)}
                                disabled={selectedUserId === ''}
                              />
                            }
                            label={notif.name}
                          />
                        </Grid>
                      ))}
                    </Grid>
                  </FormGroup>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        )}
      </Box>

      {/* الرت وضعیت عملیات */}
      {alertMessage && (
        <Stack sx={{ width: '100%', mt: 3 }} spacing={2}>
          <Alert severity={alertSeverity} onClose={clearAlert}>
            {alertMessage}
          </Alert>
        </Stack>
      )}

      {/* دکمه ثبت نهایی تنظیمات */}
      <Box display="flex" justifyContent="flex-end" mt={4} mb={2}>
        <CustomTooltip title={isTooltipGloballyEnabled ? "Tüm değişiklikleri kaydetmek için tıklayınız" : ""}>
          <Button
            variant="contained"
            color="success"
            size="large"
            onClick={handleSaveConfig}
            disabled={loadingButton || (targetType === 'role' ? selectedRoleId === '' : selectedUserId === '')}
            sx={{ minWidth: '180px' }}
          >
            {loadingButton ? (
              <>
                <CircularProgress size={20} color="inherit" sx={{ mr: 1 }} /> İşlem Yapılıyor...
              </>
            ) : (
              <>
                <BoltIcon color="inherit" sx={{ mr: 1, fontSize: 20 }} /> Kaydet / Güncelle
              </>
            )}
          </Button>
        </CustomTooltip>
      </Box>
    </Box>
  );
}