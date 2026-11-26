/** API 응답 상태 코드를 담는 도메인 에러 */
export class HttpError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

export const notFound = (what = "대상") => new HttpError(404, `${what}을(를) 찾을 수 없습니다.`);
export const conflict = (msg: string) => new HttpError(409, msg);
export const badRequest = (msg: string) => new HttpError(400, msg);
