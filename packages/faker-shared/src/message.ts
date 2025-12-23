// logger message

export enum ErrorCode {
  COMMON_ERROR,
}

export enum WarningCode {
  COMMON_WARNING,
}

export const errorMessages: Record<ErrorCode, string> = {
  [ErrorCode.COMMON_ERROR]: 'Common error',
}

export const warningMessages: Record<WarningCode, string> = {
  [WarningCode.COMMON_WARNING]: 'Common warning',
}
