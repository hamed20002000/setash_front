// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import React from 'react';
import { Grid, Box, Typography } from '@mui/material';

import PageContainer from 'src/components/container/PageContainer';

import img1 from 'src/assets/images/backgrounds/login-bg.svg';

import AuthForgotPassword from '../authForms/AuthForgotPassword';

const ForgotPassword = () => (
  <PageContainer title="Forgot Password" description="this is Forgot Password page">
    <Grid container justifyContent="center" spacing={0} sx={{ overflowX: 'hidden' }}>
      <Grid
        item
        xs={12}
        sm={12}
        lg={8}
        xl={9}
        sx={{
          position: 'relative',
          '&:before': {
            content: '""',
            background: 'radial-gradient(#d2f1df, #d3d7fa, #bad8f4)',
            backgroundSize: '400% 400%',
            animation: 'gradient 15s ease infinite',
            position: 'absolute',
            height: '100%',
            width: '100%',
            opacity: '0.3',
          },
        }}
      >
        <Box position="relative">
          <Box
            alignItems="center"
            justifyContent="center"
            height={'calc(100vh)'}
            sx={{
              display: {
                xs: 'none',
                lg: 'flex',
              },
            }}
          >
            <img
              src={img1}
              alt="bg"
              style={{
                width: '100%',
                maxWidth: '500px',
              }}
            />
          </Box>
        </Box>
      </Grid>
      <Grid
        item
        xs={12}
        sm={12}
        lg={4}
        xl={3}
        display="flex"
        justifyContent="center"
        alignItems="center"
      >
        <Box p={4}>
          <Typography variant="h4" fontWeight="700">
            Şifrenizi mi unuttunuz?
          </Typography>

          <Typography color="textSecondary" variant="subtitle2" fontWeight="400" mt={2}>
            Lütfen hesabınızla ilişkili e-posta adresini girin ve size şifrenizi 
            sıfırlamanız için bir bağlantı göndereceğiz.
          </Typography>
          <AuthForgotPassword />
        </Box>
      </Grid>
    </Grid>
  </PageContainer>
);

export default ForgotPassword;
