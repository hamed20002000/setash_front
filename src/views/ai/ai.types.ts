export type FunctionCallResultType={
    result:"error"|"success",
    message:string,
    list:any[],
    time:string,
    id:string,
    attachments?:File[],
    continuePrompt?:string,
    toolName?:string,
}

export type SelectedFileType={
    file:File,
    path:string,
}


export interface JwtPayload {
  username?: string;
  role?: string | string[];
  userid?: string;
}
