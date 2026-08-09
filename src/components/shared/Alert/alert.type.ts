import { AlertColor } from "@mui/material"



export type AlertType={
    onClose: () => void,
    severity: AlertColor, 
    alertMessage: string 
}