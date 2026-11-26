// 브라우저용 API 호출 헬퍼

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export async function api<T = unknown>(path: string, method = "GET", body?: unknown): Promise<T> {
  const res = await fetch(path, {
    method,
    headers: body !== undefined ? { "content-type": "application/json" } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });
  if (res.status === 204) return undefined as T;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = (data as { error?: string }).error ?? "요청에 실패했습니다.";
    // 세션 만료 시 재로그인 안내 (화면 이동은 사용자 판단에 맡긴다)
    throw new ApiError(res.status, res.status === 401 ? `${message} 관리자 메뉴에서 다시 로그인해 주세요.` : message);
  }
  return data as T;
}

export const fetcher = <T,>(path: string) => api<T>(path);
