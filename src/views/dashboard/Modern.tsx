// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import React, { useEffect, useState } from 'react'; // useEffect و useState اضافه شدند
import { Box, Grid } from '@mui/material';
import PageContainer from 'src/components/container/PageContainer';

import TopCards from 'src/components/dashboards/modern/TopCards';
import RevenueUpdates from 'src/components/dashboards/modern/RevenueUpdates';
import YearlyBreakup from 'src/components/dashboards/modern/YearlyBreakup';
import MonthlyEarnings from 'src/components/dashboards/modern/MonthlyEarnings';
import EmployeeSalary from 'src/components/dashboards/modern/EmployeeSalary';
import Customers from 'src/components/dashboards/modern/Customers';
import Projects from 'src/components/dashboards/modern/Projects';
import Social from 'src/components/dashboards/modern/Social';
import SellingProducts from 'src/components/dashboards/modern/SellingProducts';
import WeeklyStats from 'src/components/dashboards/modern/WeeklyStats';
import TopPerformers from 'src/components/dashboards/modern/TopPerformers';
import Welcome from 'src/layouts/full/shared/welcome/Welcome'; // کامپوننت Welcome شما

const WELCOME_MESSAGE_KEY = 'hasSeenWelcomeMessage'; // کلید برای localStorage

const Modern = () => {
  const [showWelcome, setShowWelcome] = useState(false); // وضعیت برای کنترل نمایش Welcome

  useEffect(() => {
    // در هنگام بارگذاری کامپوننت (یک بار)
    const hasSeen = localStorage.getItem(WELCOME_MESSAGE_KEY);

    if (!hasSeen) {
      // اگر کاربر قبلاً پیام Welcome را ندیده باشد
      setShowWelcome(true); // پیام را نمایش بده
      localStorage.setItem(WELCOME_MESSAGE_KEY, 'true'); // نشانگر را تنظیم کن
    }
    // اگر `hasSeen` وجود داشت، `showWelcome` به صورت پیش‌فرض false می‌ماند و Welcome نمایش داده نمی‌شود.

    // می‌توانید اینجا یک منطق برای پاک کردن نشانگر بعد از مثلاً 24 ساعت هم اضافه کنید،
    // یا آن را به رویداد لاگ اوت مرتبط کنید.
    // مثلاً:
    // const clearWelcomeOnLogout = () => {
    //   localStorage.removeItem(WELCOME_MESSAGE_KEY);
    // };
    // window.addEventListener('logout', clearWelcomeOnLogout); // فرضاً یک ایونت 'logout' دارید
    // return () => window.removeEventListener('logout', clearWelcomeOnLogout);

  }, []); // [] یعنی این useEffect فقط یک بار پس از اولین رندر اجرا می‌شود

  return (
    <PageContainer title="Setaş Portal" description="">
      <Box>
        <Grid container spacing={3}>
          {/* column */}
          <Grid item xs={12} lg={12}>
            <TopCards />
          </Grid>
          {/* column */}
          <Grid item xs={12} lg={8}>
            <RevenueUpdates />
          </Grid>
          {/* column */}
          <Grid item xs={12} lg={4}>
            <Grid container spacing={3}>
              <Grid item xs={12} sm={6} lg={12}>
                <YearlyBreakup />
              </Grid>
              <Grid item xs={12} sm={6} lg={12}>
                <MonthlyEarnings />
              </Grid>
            </Grid>
          </Grid>
          {/* column */}
          <Grid item xs={12} lg={4}>
            <EmployeeSalary />
          </Grid>
          {/* column */}
          <Grid item xs={12} lg={4}>
            <Grid container spacing={3}>
              <Grid item xs={12} sm={6}>
                <Customers />
              </Grid>
              <Grid item xs={12} sm={6}>
                <Projects />
              </Grid>
              <Grid item xs={12}>
                <Social />
              </Grid>
            </Grid>
          </Grid>
          {/* column */}
          <Grid item xs={12} lg={4}>
            <SellingProducts />
          </Grid>
          {/* column */}
          <Grid item xs={12} lg={4}>
            <WeeklyStats />
          </Grid>
          {/* column */}
          <Grid item xs={12} lg={8}>
            <TopPerformers />
          </Grid>
        </Grid>
        {/* **نمایش شرطی کامپوننت Welcome** */}
        {showWelcome && (
          <Grid item xs={12}> {/* می‌توانید Welcome را هم داخل یک Grid Item قرار دهید */}
            <Welcome />
          </Grid>
        )}
      </Box>
    </PageContainer>
  );
};

export default Modern;