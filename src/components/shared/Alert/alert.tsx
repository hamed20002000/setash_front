import { Stack, Alert as MuiAlert } from "@mui/material"
import { AlertType } from "./alert.type"






const Alert = ({ onClose, severity, alertMessage }: AlertType) => {

    return (
        <Stack sx={{ width: '100%', mt: 2 }} spacing={2}>
            <MuiAlert severity={severity} onClose={onClose}>
                {alertMessage}
            </MuiAlert>
        </Stack>
    )
}

export default Alert





