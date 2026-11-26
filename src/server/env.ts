/** 필수 환경 변수를 읽는다. 누락 시 어떤 키가 없는지 명확히 알린다. */
function required(key: "MONGODB_URI" | "ADMIN_PASSWORD" | "SESSION_SECRET"): string {
  const v = process.env[key];
  if (!v) throw new Error(`환경 변수 ${key}가 설정되지 않았습니다. (.env.local 또는 Vercel Env 확인)`);
  return v;
}

export const env = {
  get mongoUri() {
    return required("MONGODB_URI");
  },
  get adminPassword() {
    return required("ADMIN_PASSWORD");
  },
  get sessionSecret() {
    return required("SESSION_SECRET");
  },
};
