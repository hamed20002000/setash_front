export type FunctionCallResultType={
    result:"error"|"success",
    message:string,
    list:any[],
    time:string,
    id:string,
    attachments?:File[]
}

export type SelectedFileType={
    file:File,
    path:string,
}
