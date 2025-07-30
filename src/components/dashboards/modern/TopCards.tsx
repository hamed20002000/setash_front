import { useState, useEffect, useCallback } from 'react';
import { Box, CardContent, Grid, Typography, CircularProgress } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import server from '../../../assets/address.json';

import icon1 from '../../../assets/images/svgs/icon-connect.svg';
import icon2 from '../../../assets/images/svgs/icon-user-male.svg';
import icon3 from '../../../assets/images/svgs/icon-briefcase.svg';
import icon4 from '../../../assets/images/svgs/icon-mailbox.svg';
import icon5 from '../../../assets/images/svgs/icon-favorites.svg';
import iconNetwork from '../../../assets/images/svgs/icon-network.svg';

interface CardType {
  icon: string;
  title: string;
  digits: string;
  bgcolor: string;
  loading?: boolean;
}

const initialTopCards: CardType[] = [
  {
    icon: icon2,
    title: 'Total Users',
    digits: '...',
    bgcolor: 'primary',
    loading: true,
  },
  {
    icon: icon3,
    title: 'Total Tenders',
    digits: '...',
    bgcolor: 'warning',
    loading: true,
  },
  {
    icon: icon4,
    title: 'Total Works',
    digits: '...',
    bgcolor: 'secondary',
    loading: true,
  },
  {
    icon: icon1, // یا آیکون مناسب دیگر برای Direkler
    title: 'Total Direkler',
    digits: '...',
    bgcolor: 'info', // قبلاً info بود، اینجا یک رنگ دیگر انتخاب کردم یا می‌توانید تغییر دهید.
    loading: true,
  },
  {
    // ✅ کارت جدید برای Network ها
    icon: iconNetwork, // از آیکون جدید استفاده کنید
    title: 'Total Networks', // عنوان مناسب
    digits: '...',
    bgcolor: 'error', // رنگ مناسب
    loading: true,
  },
  {
    icon: icon5, // آیکون و عنوان باقی موارد را می‌توانید تغییر دهید
    title: 'Reports',
    digits: '...',
    bgcolor: 'success',
    loading: false,
  },
];

const TopCards = () => {
  const navigate = useNavigate();
  const [cardsData, setCardsData] = useState<CardType[]>(initialTopCards);

  const showAlert = useCallback((message: string, severity: 'success' | 'error' | 'warning' | 'info') => {
    console.log(`Alert: ${severity} - ${message}`);
  }, []);

  // 1. تابع برای دریافت تعداد کاربران
  const fetchTotalUsers = useCallback(async () => {
    setCardsData(prev => prev.map(card => card.title === 'Total Users' ? { ...card, loading: true } : card));
    const authToken = localStorage.getItem('authToken');
    if (!authToken) {
      navigate("/");
      showAlert('Authentication required to fetch user count.', 'error');
      setCardsData(prev => prev.map(card => card.title === 'Total Users' ? { ...card, loading: false, digits: 'N/A' } : card));
      return;
    }
    try {
      const response = await axios.get(server.baseurl + server.user + "get-users", {
        headers: { "Accept": "application/json", "Authorization": `Bearer ${authToken}` }
      });
      if (response.data.httpStatusCode === 200) {
        const totalUsers = response.data.data ? response.data.data.length : 0;
        setCardsData(prev => prev.map(card => card.title === 'Total Users' ? { ...card, digits: String(totalUsers), loading: false } : card));
      } else {
        showAlert(response.data.message || 'Failed to fetch user count.', 'error');
        setCardsData(prev => prev.map(card => card.title === 'Total Users' ? { ...card, loading: false, digits: 'Error' } : card));
      }
    } catch (e: any) {
      console.error("Error fetching user count:", e);
      showAlert('Error fetching user count. Please try again.', 'error');
      setCardsData(prev => prev.map(card => card.title === 'Total Users' ? { ...card, loading: false, digits: 'Error' } : card));
      if (e.response && e.response.status === 401) {
        localStorage.removeItem('authToken');
        navigate("/");
      }
    }
  }, [navigate, showAlert]);

  // 2. تابع برای دریافت تعداد مناقصه (Tenders)
  const fetchTotalTenders = useCallback(async () => {
    setCardsData(prev => prev.map(card => card.title === 'Total Tenders' ? { ...card, loading: true } : card));
    const authToken = localStorage.getItem('authToken');
    if (!authToken) {
      navigate("/");
      showAlert('Authentication required to fetch tender count.', 'error');
      setCardsData(prev => prev.map(card => card.title === 'Total Tenders' ? { ...card, loading: false, digits: 'N/A' } : card));
      return;
    }
    try {
      const response = await axios.get(server.baseurl + server.initialoperations + "get-tenders", {
        headers: { "Accept": "application/json", "Authorization": `Bearer ${authToken}` }
      });
      if (response.data.httpStatusCode === 200) {
        const activeTenders = response.data.data ? response.data.data.filter((item: any) => item.recordStatus === 0) : [];
        setCardsData(prev => prev.map(card => card.title === 'Total Tenders' ? { ...card, digits: String(activeTenders.length), loading: false } : card));
      } else {
        showAlert(response.data.message || 'Failed to fetch tender count.', 'error');
        setCardsData(prev => prev.map(card => card.title === 'Total Tenders' ? { ...card, loading: false, digits: 'Error' } : card));
      }
    } catch (e: any) {
      console.error("Error fetching tender count:", e);
      showAlert('Error fetching tender count. Please try again.', 'error');
      setCardsData(prev => prev.map(card => card.title === 'Total Tenders' ? { ...card, loading: false, digits: 'Error' } : card));
      if (e.response && e.response.status === 401) {
        localStorage.removeItem('authToken');
        navigate("/");
      }
    }
  }, [navigate, showAlert]);

  // 3. تابع برای دریافت تعداد کارها (Works)
  const fetchTotalWorks = useCallback(async () => {
    setCardsData(prev => prev.map(card => card.title === 'Total Works' ? { ...card, loading: true } : card));
    const authToken = localStorage.getItem('authToken');
    if (!authToken) {
      navigate("/");
      showAlert('Authentication required to fetch work count.', 'error');
      setCardsData(prev => prev.map(card => card.title === 'Total Works' ? { ...card, loading: false, digits: 'N/A' } : card));
      return;
    }
    try {
      const response = await axios.get(server.baseurl + server.initialoperations + "get-works", {
        headers: { "Accept": "application/json", "Authorization": `Bearer ${authToken}` }
      });
      if (response.data.httpStatusCode === 200) {
        const activeWorks = response.data.data ? response.data.data.filter((item: any) => item.recordStatus === 0) : [];
        setCardsData(prev => prev.map(card => card.title === 'Total Works' ? { ...card, digits: String(activeWorks.length), loading: false } : card));
      } else {
        showAlert(response.data.message || 'Failed to fetch work count.', 'error');
        setCardsData(prev => prev.map(card => card.title === 'Total Works' ? { ...card, loading: false, digits: 'Error' } : card));
      }
    } catch (e: any) {
      console.error("Error fetching work count:", e);
      showAlert('Error fetching work count. Please try again.', 'error');
      setCardsData(prev => prev.map(card => card.title === 'Total Works' ? { ...card, loading: false, digits: 'Error' } : card));
      if (e.response && e.response.status === 401) {
        localStorage.removeItem('authToken');
        navigate("/");
      }
    }
  }, [navigate, showAlert]);

  // 4. تابع برای دریافت تعداد Direkler (Product Types)
  const fetchTotalDirekler = useCallback(async () => {
    setCardsData(prev => prev.map(card => card.title === 'Total Direkler' ? { ...card, loading: true } : card));
    const authToken = localStorage.getItem('authToken');
    if (!authToken) {
      navigate("/");
      showAlert('Authentication required to fetch Direkler count.', 'error');
      setCardsData(prev => prev.map(card => card.title === 'Total Direkler' ? { ...card, loading: false, digits: 'N/A' } : card));
      return;
    }
    try {
      const response = await axios.get(server.baseurl + server.initialoperations + "get-product-types", {
        headers: { "Accept": "application/json", "Authorization": `Bearer ${authToken}` }
      });
      if (response.data.httpStatusCode === 200) {
        const activeDirekler = response.data.data ? response.data.data.filter((item: any) => item.recordStatus === 0) : [];
        setCardsData(prev => prev.map(card => card.title === 'Total Direkler' ? { ...card, digits: String(activeDirekler.length), loading: false } : card));
      } else {
        showAlert(response.data.message || 'Failed to fetch Direkler count.', 'error');
        setCardsData(prev => prev.map(card => card.title === 'Total Direkler' ? { ...card, loading: false, digits: 'Error' } : card));
      }
    } catch (e: any) {
      console.error("Error fetching Direkler count:", e);
      showAlert('Error fetching Direkler count. Please try again.', 'error');
      setCardsData(prev => prev.map(card => card.title === 'Total Direkler' ? { ...card, loading: false, digits: 'Error' } : card));
      if (e.response && e.response.status === 401) {
        localStorage.removeItem('authToken');
        navigate("/");
      }
    }
  }, [navigate, showAlert]);

  // ✅ 5. تابع برای دریافت تعداد Networks
  const fetchTotalNetworks = useCallback(async () => {
    setCardsData(prev => prev.map(card => card.title === 'Total Networks' ? { ...card, loading: true } : card));
    const authToken = localStorage.getItem('authToken');
    if (!authToken) {
      navigate("/");
      showAlert('Authentication required to fetch Networks count.', 'error');
      setCardsData(prev => prev.map(card => card.title === 'Total Networks' ? { ...card, loading: false, digits: 'N/A' } : card));
      return;
    }
    try {
      // از همین API استفاده می کنیم، اما فیلتر workId را در اینجا اعمال نمی کنیم
      const response = await axios.get(server.baseurl + server.initialoperations + "get-networks", {
        headers: { "Accept": "application/json", "Authorization": `Bearer ${authToken}` }
      });
      if (response.data.httpStatusCode === 200) {
        // فیلتر کردن بر اساس recordStatus=0 اگر فقط Active ها را می‌خواهید
        const activeNetworks = response.data.data ? response.data.data.filter((item: any) => item.recordStatus === 0) : [];
        setCardsData(prev => prev.map(card => card.title === 'Total Networks' ? { ...card, digits: String(activeNetworks.length), loading: false } : card));
      } else {
        showAlert(response.data.message || 'Failed to fetch Networks count.', 'error');
        setCardsData(prev => prev.map(card => card.title === 'Total Networks' ? { ...card, loading: false, digits: 'Error' } : card));
      }
    } catch (e: any) {
      console.error("Error fetching Networks count:", e);
      showAlert('Error fetching Networks count. Please try again.', 'error');
      setCardsData(prev => prev.map(card => card.title === 'Total Networks' ? { ...card, loading: false, digits: 'Error' } : card));
      if (e.response && e.response.status === 401) {
        localStorage.removeItem('authToken');
        navigate("/");
      }
    }
  }, [navigate, showAlert]);


  // useEffect برای فراخوانی توابع fetch در زمان mount شدن کامپوننت
  useEffect(() => {
    fetchTotalUsers();
    fetchTotalTenders();
    fetchTotalWorks();
    fetchTotalDirekler();
    fetchTotalNetworks(); // ✅ فراخوانی تابع جدید
  }, [fetchTotalUsers, fetchTotalTenders, fetchTotalWorks, fetchTotalDirekler, fetchTotalNetworks]); // Dependency array


  return (
    <Grid container spacing={3} mt={3}>
      {cardsData.map((card, i) => (
        <Grid item xs={12} sm={4} lg={2} key={i}>
          <Box bgcolor={card.bgcolor + '.light'} textAlign="center">
            <CardContent>
              <img src={card.icon} alt={card.title} width="50" />
              <Typography
                color={card.bgcolor + '.main'}
                mt={1}
                variant="subtitle1"
                fontWeight={600}
              >
                {card.title}
              </Typography>
              <Typography color={card.bgcolor + '.main'} variant="h4" fontWeight={600}>
                {card.loading ? <CircularProgress size={24} color="inherit" /> : card.digits}
              </Typography>
            </CardContent>
          </Box>
        </Grid>
      ))}
    </Grid>
  );
};

export default TopCards;