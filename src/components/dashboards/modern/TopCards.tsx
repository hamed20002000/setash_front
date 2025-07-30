import { useState, useEffect, useCallback } from 'react';
import { Box, CardContent, Grid, Typography, CircularProgress } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import server from '../../../assets/address.json';

import icon2 from '../../../assets/images/svgs/icon-user-male.svg';
import icon3 from '../../../assets/images/svgs/icon-park-gavel.svg';
import icon4 from '../../../assets/images/svgs/icon-work.svg';

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
    title: 'Kullanıcı Sayısı',
    digits: '...',
    bgcolor: 'primary',
    loading: true,
  },
  {
    icon: icon3,
    title: 'İhale Sayısı',
    digits: '...',
    bgcolor: 'warning',
    loading: true,
  },
  {
    icon: icon4,
    title: 'İş Sayısı',
    digits: '...',
    bgcolor: 'secondary',
    loading: true,
  },
];

const TopCards = () => {
  const navigate = useNavigate();
  const [cardsData, setCardsData] = useState<CardType[]>(initialTopCards);

  const showAlert = useCallback((message: string, severity: 'success' | 'error' | 'warning' | 'info') => {
    console.log(`Alert: ${severity} - ${message}`);
  }, []);

  const fetchTotalUsers = useCallback(async () => {
    setCardsData(prev => prev.map(card => card.title === 'Kullanıcı Sayısı' ? { ...card, loading: true } : card));
    const authToken = localStorage.getItem('authToken');
    if (!authToken) {
      navigate("/");
      showAlert('Authentication required to fetch user count.', 'error');
      setCardsData(prev => prev.map(card => card.title === 'Kullanıcı Sayısı' ? { ...card, loading: false, digits: 'N/A' } : card));
      return;
    }
    try {
      const response = await axios.get(server.baseurl + server.user + "get-users", {
        headers: { "Accept": "application/json", "Authorization": `Bearer ${authToken}` }
      });
      if (response.data.httpStatusCode === 200) {
        const totalUsers = response.data.data ? response.data.data.length : 0;
        setCardsData(prev => prev.map(card => card.title === 'Kullanıcı Sayısı' ? { ...card, digits: String(totalUsers), loading: false } : card));
      } else {
        showAlert(response.data.message || 'Failed to fetch user count.', 'error');
        setCardsData(prev => prev.map(card => card.title === 'Kullanıcı Sayısı' ? { ...card, loading: false, digits: 'Error' } : card));
      }
    } catch (e: any) {
      console.error("Error fetching user count:", e);
      showAlert('Error fetching user count. Please try again.', 'error');
      setCardsData(prev => prev.map(card => card.title === 'Kullanıcı Sayısı' ? { ...card, loading: false, digits: 'Error' } : card));
      if (e.response && e.response.status === 401) {
        localStorage.removeItem('authToken');
        navigate("/");
      }
    }
  }, [navigate, showAlert]);

  const fetchTotalTenders = useCallback(async () => {
    setCardsData(prev => prev.map(card => card.title === 'İhale Sayısı' ? { ...card, loading: true } : card));
    const authToken = localStorage.getItem('authToken');
    if (!authToken) {
      navigate("/");
      showAlert('Authentication required to fetch tender count.', 'error');
      setCardsData(prev => prev.map(card => card.title === 'İhale Sayısı' ? { ...card, loading: false, digits: 'N/A' } : card));
      return;
    }
    try {
      const response = await axios.get(server.baseurl + server.initialoperations + "get-tenders", {
        headers: { "Accept": "application/json", "Authorization": `Bearer ${authToken}` }
      });
      if (response.data.httpStatusCode === 200) {
        const activeTenders = response.data.data ? response.data.data.filter((item: any) => item.recordStatus === 0) : [];
        setCardsData(prev => prev.map(card => card.title === 'İhale Sayısı' ? { ...card, digits: String(activeTenders.length), loading: false } : card));
      } else {
        showAlert(response.data.message || 'Failed to fetch tender count.', 'error');
        setCardsData(prev => prev.map(card => card.title === 'İhale Sayısı' ? { ...card, loading: false, digits: 'Error' } : card));
      }
    } catch (e: any) {
      console.error("Error fetching tender count:", e);
      showAlert('Error fetching tender count. Please try again.', 'error');
      setCardsData(prev => prev.map(card => card.title === 'İhale Sayısı' ? { ...card, loading: false, digits: 'Error' } : card));
      if (e.response && e.response.status === 401) {
        localStorage.removeItem('authToken');
        navigate("/");
      }
    }
  }, [navigate, showAlert]);

  const fetchTotalWorks = useCallback(async () => {
    setCardsData(prev => prev.map(card => card.title === 'İş Sayısı' ? { ...card, loading: true } : card));
    const authToken = localStorage.getItem('authToken');
    if (!authToken) {
      navigate("/");
      showAlert('Authentication required to fetch work count.', 'error');
      setCardsData(prev => prev.map(card => card.title === 'İş Sayısı' ? { ...card, loading: false, digits: 'N/A' } : card));
      return;
    }
    try {
      const response = await axios.get(server.baseurl + server.initialoperations + "get-works", {
        headers: { "Accept": "application/json", "Authorization": `Bearer ${authToken}` }
      });
      if (response.data.httpStatusCode === 200) {
        const activeWorks = response.data.data ? response.data.data.filter((item: any) => item.recordStatus === 0) : [];
        setCardsData(prev => prev.map(card => card.title === 'İş Sayısı' ? { ...card, digits: String(activeWorks.length), loading: false } : card));
      } else {
        showAlert(response.data.message || 'Failed to fetch work count.', 'error');
        setCardsData(prev => prev.map(card => card.title === 'İş Sayısı' ? { ...card, loading: false, digits: 'Error' } : card));
      }
    } catch (e: any) {
      console.error("Error fetching work count:", e);
      showAlert('Error fetching work count. Please try again.', 'error');
      setCardsData(prev => prev.map(card => card.title === 'İş Sayısı' ? { ...card, loading: false, digits: 'Error' } : card));
      if (e.response && e.response.status === 401) {
        localStorage.removeItem('authToken');
        navigate("/");
      }
    }
  }, [navigate, showAlert]);


  useEffect(() => {
    fetchTotalUsers();
    fetchTotalTenders();
    fetchTotalWorks();
  }, [fetchTotalUsers, fetchTotalTenders, fetchTotalWorks]);


  return (
    // ✅ تغییر در اینجا: اضافه کردن justifyContent و تنظیم lg={4}
    <Grid container spacing={3} mt={3} justifyContent="center">
      {cardsData.map((card, i) => (
        <Grid item xs={12} sm={4} lg={4} key={i}> {/* ✅ تغییر lg={2} به lg={4} */}
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