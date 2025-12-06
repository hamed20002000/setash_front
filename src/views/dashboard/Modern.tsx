import { useEffect, useState } from 'react';
import { Box, Grid } from '@mui/material';
import PageContainer from 'src/components/container/PageContainer';
import Welcome from 'src/layouts/full/shared/welcome/Welcome';

// ایمپورت همه کامپوننت‌های آماری
import DashboardStats from './DashboardStats';
import WorkhouseBetonStats from './WorkhouseBetonStats';
import WorkhouseSalaryStats from './WorkhouseSalaryStats';
import WorkhouseFuelStats from './WorkhouseFuelStats';
import WorkhouseDispatchStats from './WorkhouseDispatchStats'; // <-- کامپوننت جدید

const WELCOME_MESSAGE_KEY = 'hasSeenWelcomeMessage';

const Modern = () => {
  const [showWelcome, setShowWelcome] = useState(false);

  useEffect(() => {
    const hasSeen = localStorage.getItem(WELCOME_MESSAGE_KEY);
    if (!hasSeen) {
      setShowWelcome(true);
      localStorage.setItem(WELCOME_MESSAGE_KEY, 'true');
    }
  }, []);

  return (
    <PageContainer title="Setaş Portal" description="Dashboard">
      <Box>
        <Grid container spacing={3}>

          {/* 1. آمار کلی (کارت‌های رنگی اصلی) */}
          <Grid item xs={12}>
            <DashboardStats />
          </Grid>

          {/* 2. آمار بتن */}
          <Grid item xs={12}>
            <WorkhouseBetonStats />
          </Grid>

          {/* 3. آمار حقوق */}
          <Grid item xs={12}>
            <WorkhouseSalaryStats />
          </Grid>

          {/* 4. آمار سوخت */}
          <Grid item xs={12}>
            <WorkhouseFuelStats />
          </Grid>

          {/* 5. آمار ارسال/Sevk (جدید) */}
          <Grid item xs={12}>
            <WorkhouseDispatchStats />
          </Grid>

          {/* پیام خوش‌آمدگویی */}
          {showWelcome && (
            <Grid item xs={12}>
              <Welcome />
            </Grid>
          )}

        </Grid>
      </Box>
    </PageContainer>
  );
};

export default Modern;