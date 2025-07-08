// DeleteListUser.tsx
import React, { useState } from 'react'; // Import useState
import {
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  CircularProgress, // Import CircularProgress
} from '@mui/material';
import axios from 'axios';
import BoltIcon from '@mui/icons-material/Bolt';
import server from '../../../assets/address.json';

type Props = {
  openModal: boolean;
  userIdToDelete: number | null; // User ID to be deleted
  onClose: () => void;
  onDeleteSuccess: () => void; // Function to refresh the main list
  showAlert: (message: string, severity: 'success' | 'error' | 'warning' | 'info') => void;
};

const DeleteListUser = ({ openModal, userIdToDelete, onClose, onDeleteSuccess, showAlert }: Props) => {
  const [loading, setLoading] = useState<boolean>(false); // New state for button loading

  const handleDeleteUser = async () => {
    if (userIdToDelete === null) {
      showAlert('Silinecek kullanıcı seçilmedi.', 'warning');
      onClose();
      return;
    }

    const authToken = localStorage.getItem('authToken');
    if (!authToken) {
      showAlert('Lütfen giriş yapın.', 'warning');
      // In a real app, you might want to redirect to login here if not already handled by an interceptor
      return;
    }

    setLoading(true); // Start loading
    try {
      // Using axios.delete as per your provided snippet
      const response = await axios.delete(
        `${server.baseurl}${server.user}delete-user/${userIdToDelete}`, // API endpoint for deleting a user by ID
        {
          headers: {
            "Accept": "application/json",
            "Authorization": `Bearer ${authToken}`,
          }
        }
      );

      // Check the httpStatusCode from the response data
      if (response.data.httpStatusCode === 200) {
        showAlert('Kullanıcı başarıyla silindi!', 'success');
        onDeleteSuccess(); // Call function to refresh the list in the parent component
        onClose(); // Close the modal
      } else {
        // Handle server-side errors
        showAlert(response.data.message || 'Kullanıcı silinirken bir hata oluştu.', 'error');
      }
    } catch (e: any) {
      console.error("Error deleting user:", e);
      // Get a more specific error message from the server response if available
      const errorMessage = e.response?.data?.message || 'Kullanıcı silinirken bir hata oluştu, lütfen tekrar deneyin.';
      showAlert(errorMessage, 'error');
      // Optionally, handle 401 Unauthorized errors here
      if (e.response && e.response.status === 401) {
        localStorage.removeItem('authToken');
        // You might want to trigger a global redirect or re-login flow here
      }
    } finally {
      setLoading(false); // End loading (whether successful or not)
    }
  };

  return (
    <>
      <Dialog
        open={openModal}
        onClose={onClose}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description">
        <DialogTitle id="alert-dialog-title">
          {"Bu kullanıcıyı silmek istediğinizden emin misiniz?"}
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="alert-dialog-description">
            Eğer silerseniz, geri almanın bir yolu yoktur.
            Kayıtı silmek istediğinizden eminseniz, **Silmek** düğmesine tıklayın.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          {/* Disable the "İptal Et" button when loading to prevent multiple clicks */}
          <Button onClick={onClose} disabled={loading}>İptal Et</Button>
          <Button
            color="error"
            variant="contained" // Typically primary action buttons are contained
            onClick={handleDeleteUser}
            autoFocus
            disabled={loading} // Disable the delete button when loading
          >
            {loading ? <>
                <BoltIcon sx={{ mr: 1 }} /> Beklemek....
              </> : 'Silmek'} {/* Show loading spinner or text */}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

export default DeleteListUser;