import Image from "next/image";
import mainImage from "../../public/main.webp";

/**
 * 상단 헤더(h-14)와 하단 탭바(h-16) 사이 영역을 대표 이미지로 채운다.
 * 한줄 공지(#notice-bar, h-10)가 있으면 그 아래부터 시작한다.
 */
export function NoTournament() {
  return (
    <section className="fixed inset-x-0 top-14 [body:has(#notice-bar)_&]:top-[6rem] bottom-[calc(4rem+env(safe-area-inset-bottom))] mx-auto max-w-[480px] overflow-hidden">
      <Image
        src={mainImage}
        alt="테동회 테니스 토너먼트"
        fill
        priority
        placeholder="blur"
        sizes="(max-width: 480px) 100vw, 480px"
        className="object-cover object-top"
      />
      <div className="absolute inset-0 flex items-center justify-center px-6">
        <p className="rounded-2xl border border-line bg-surface/85 px-5 py-4 text-center text-base leading-relaxed font-semibold text-ink shadow-lg backdrop-blur-md">
          현재 진행중인 대회가 없습니다.
          <br />
          대회를 생성해주세요.
        </p>
      </div>
    </section>
  );
}
