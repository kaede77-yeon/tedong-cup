import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 개발 서버에 휴대폰 등 같은 네트워크 기기로 접속 허용 (미허용 시 JS 하이드레이션이 막혀 클릭이 동작하지 않음)
  allowedDevOrigins: ["105.23.2.45", "192.168.*.*", "10.*.*.*", "172.*.*.*"],
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
