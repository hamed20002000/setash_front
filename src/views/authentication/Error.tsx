
import { Box, Container, Typography, Button } from '@mui/material';
import { useNavigate } from 'react-router-dom'; // Import useNavigate
import ErrorImg from 'src/assets/images/backgrounds/errorimg.svg';

const Error = () => {
  const navigate = useNavigate(); // Get the navigate function

  const handleGoBack = () => {
    const authToken = localStorage.getItem('authToken'); // Check for the token

    if (authToken) {
      // If token exists, navigate to the dashboard
      navigate('/dashboards/dashboard');
    } else {
      // If token does not exist, navigate to the login page
      navigate('/auth/login');
    }
  };

  return (
    <Box
      display="flex"
      flexDirection="column"
      height="100vh"
      textAlign="center"
      justifyContent="center"
    >
      <Container maxWidth="md">
        <img src={ErrorImg} alt="404" />
        <Typography align="center" variant="h1" mb={4}>
          Eyvah!
        </Typography>
        <Typography align="center" variant="h4" mb={4}>
          Aradığınız sayfa bulunamadı
        </Typography>
        <Button
          color="primary"
          variant="contained"
          onClick={handleGoBack} // Use onClick to trigger our conditional logic
          disableElevation
        >
          Ana Sayfaya Geri Dön
        </Button>
      </Container>
    </Box>
  );
};

export default Error;