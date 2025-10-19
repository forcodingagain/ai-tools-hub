/**
 * 统一的错误处理工具
 * 提供标准化的错误响应和日志记录
 */

import { NextResponse } from 'next/server';

/**
 * 标准化的 API 错误响应格式
 */
export interface ApiErrorResponse {
  success: false;
  error: string;
  code?: string;
  details?: any;
  timestamp: string;
}

/**
 * 标准化的 API 成功响应格式
 */
export interface ApiSuccessResponse<T = any> {
  success: true;
  data?: T;
  message?: string;
  timestamp: string;
}

/**
 * 错误类型枚举
 */
export enum ErrorType {
  // 4xx 客户端错误
  BAD_REQUEST = 'BAD_REQUEST',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  NOT_FOUND = 'NOT_FOUND',
  CONFLICT = 'CONFLICT',
  VALIDATION_ERROR = 'VALIDATION_ERROR',

  // 5xx 服务器错误
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',
  DATABASE_BUSY = 'DATABASE_BUSY',
  TIMEOUT = 'TIMEOUT',
}

/**
 * HTTP 状态码映射
 */
const errorStatusMap: Record<ErrorType, number> = {
  [ErrorType.BAD_REQUEST]: 400,
  [ErrorType.UNAUTHORIZED]: 401,
  [ErrorType.FORBIDDEN]: 403,
  [ErrorType.NOT_FOUND]: 404,
  [ErrorType.CONFLICT]: 409,
  [ErrorType.VALIDATION_ERROR]: 422,
  [ErrorType.INTERNAL_ERROR]: 500,
  [ErrorType.DATABASE_ERROR]: 500,
  [ErrorType.DATABASE_BUSY]: 503,
  [ErrorType.TIMEOUT]: 504,
};

/**
 * 创建标准化的错误响应
 *
 * @param error - 错误对象或错误消息
 * @param type - 错误类型
 * @param details - 额外的错误详情
 * @returns NextResponse 对象
 *
 * @example
 * return createErrorResponse('用户不存在', ErrorType.NOT_FOUND);
 * return createErrorResponse(error, ErrorType.DATABASE_ERROR, { query: 'SELECT ...' });
 */
export function createErrorResponse(
  error: string | Error,
  type: ErrorType = ErrorType.INTERNAL_ERROR,
  details?: any
): NextResponse<ApiErrorResponse> {
  const errorMessage = typeof error === 'string' ? error : error.message;
  const statusCode = errorStatusMap[type] || 500;

  // 统一的错误日志格式
  logError(type, errorMessage, details);

  const response: ApiErrorResponse = {
    success: false,
    error: errorMessage,
    code: type,
    timestamp: new Date().toISOString(),
  };

  if (details && process.env.NODE_ENV === 'development') {
    response.details = details;
  }

  return NextResponse.json(response, { status: statusCode });
}

/**
 * 创建标准化的成功响应
 *
 * @param data - 响应数据
 * @param message - 可选的成功消息
 * @returns NextResponse 对象
 *
 * @example
 * return createSuccessResponse({ tools: [...] });
 * return createSuccessResponse(null, '删除成功');
 */
export function createSuccessResponse<T = any>(
  data?: T,
  message?: string
): NextResponse<ApiSuccessResponse<T>> {
  const response: ApiSuccessResponse<T> = {
    success: true,
    timestamp: new Date().toISOString(),
  };

  if (data !== undefined) {
    response.data = data;
  }

  if (message) {
    response.message = message;
  }

  return NextResponse.json(response);
}

/**
 * 统一的错误日志记录
 *
 * @param type - 错误类型
 * @param message - 错误消息
 * @param details - 错误详情
 */
function logError(type: ErrorType, message: string, details?: any): void {
  const timestamp = new Date().toISOString();
  const logPrefix = getLogPrefix(type);

  console.error(`${logPrefix} [${timestamp}] ${type}: ${message}`);

  if (details) {
    console.error('  详情:', JSON.stringify(details, null, 2));
  }

  // 生产环境可以发送到监控服务 (Sentry, LogRocket 等)
  if (process.env.NODE_ENV === 'production') {
    // TODO: 发送到错误监控服务
    // Sentry.captureException(new Error(message), { tags: { type }, extra: details });
  }
}

/**
 * 根据错误类型获取日志前缀
 */
function getLogPrefix(type: ErrorType): string {
  // 4xx 错误使用警告符号
  if (errorStatusMap[type] >= 400 && errorStatusMap[type] < 500) {
    return '⚠️ ';
  }
  // 5xx 错误使用错误符号
  return '❌';
}

/**
 * 从错误对象中提取有用信息
 *
 * @param error - 错误对象
 * @returns 错误类型和详情
 */
export function parseError(error: any): { type: ErrorType; details?: any } {
  // SQLite BUSY 错误
  if (
    error?.code === 'SQLITE_BUSY' ||
    error?.message?.includes('SQLITE_BUSY') ||
    error?.message?.includes('database is locked')
  ) {
    return {
      type: ErrorType.DATABASE_BUSY,
      details: { code: error.code, errno: error.errno },
    };
  }

  // SQLite 其他错误
  if (error?.code?.startsWith('SQLITE_')) {
    return {
      type: ErrorType.DATABASE_ERROR,
      details: { code: error.code, errno: error.errno },
    };
  }

  // 验证错误
  if (error?.name === 'ValidationError' || error?.message?.includes('验证失败')) {
    return { type: ErrorType.VALIDATION_ERROR };
  }

  // 超时错误
  if (error?.name === 'TimeoutError' || error?.code === 'ETIMEDOUT') {
    return { type: ErrorType.TIMEOUT };
  }

  // 默认为内部错误
  return { type: ErrorType.INTERNAL_ERROR };
}

/**
 * API 路由错误处理包装器
 * 自动捕获错误并返回标准化响应
 *
 * @param handler - API 路由处理函数
 * @returns 包装后的处理函数
 *
 * @example
 * export const GET = withErrorHandler(async (request) => {
 *   const data = await fetchData();
 *   return createSuccessResponse(data);
 * });
 */
export function withErrorHandler<TRequest extends Request = Request>(
  handler: (request: TRequest, context?: any) => Promise<NextResponse>
) {
  return async (request: TRequest, context?: any): Promise<NextResponse> => {
    try {
      return await handler(request, context);
    } catch (error: any) {
      const { type, details } = parseError(error);
      return createErrorResponse(error, type, details);
    }
  };
}

/**
 * 验证请求参数
 *
 * @param params - 要验证的参数对象
 * @param required - 必需的参数名列表
 * @throws 如果缺少必需参数
 *
 * @example
 * validateParams({ name, url }, ['name', 'url']);
 */
export function validateParams(params: Record<string, any>, required: string[]): void {
  const missing = required.filter(key => !params[key]);

  if (missing.length > 0) {
    throw new Error(`缺少必需参数: ${missing.join(', ')}`);
  }
}

/**
 * 验证 ID 参数
 *
 * @param id - ID 值
 * @param paramName - 参数名称 (用于错误消息)
 * @returns 解析后的数字 ID
 * @throws 如果 ID 无效
 *
 * @example
 * const toolId = validateId(params.id, 'toolId');
 */
export function validateId(id: any, paramName: string = 'id'): number {
  const numId = parseInt(id, 10);

  if (isNaN(numId) || numId <= 0) {
    throw new Error(`无效的 ${paramName}: ${id}`);
  }

  return numId;
}
