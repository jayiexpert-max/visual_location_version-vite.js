import CloseIcon from '@mui/icons-material/Close';
import {
  Dialog,
  DialogContent,
  IconButton,
  Typography,
} from '@mui/material';

interface EmployeePhotoDialogProps {
  open: boolean;
  username: string;
  photoUrl: string;
  onClose: () => void;
}

export function EmployeePhotoDialog({
  open,
  username,
  photoUrl,
  onClose,
}: EmployeePhotoDialogProps) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <IconButton
        aria-label="close"
        onClick={onClose}
        sx={{ position: 'absolute', right: 8, top: 8, zIndex: 1 }}
      >
        <CloseIcon />
      </IconButton>
      <DialogContent sx={{ pt: 4, pb: 3, px: 3, textAlign: 'center' }}>
        <img
          src={photoUrl}
          alt={username}
          style={{
            width: '100%',
            maxWidth: 360,
            maxHeight: '70vh',
            objectFit: 'contain',
            objectPosition: 'top center',
            borderRadius: 12,
            boxShadow: '0 8px 32px rgba(15, 23, 42, 0.15)',
          }}
        />
        <Typography variant="h6" sx={{ mt: 2, fontWeight: 700 }}>
          {username}
        </Typography>
      </DialogContent>
    </Dialog>
  );
}
