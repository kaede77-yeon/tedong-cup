"use client";

import { useMemo, useState } from "react";
import { Check, Shuffle, X } from "lucide-react";
import { Button, Notice } from "@/components/ui";
import { api } from "@/lib/client";
import { SUPPORTED_SIZES } from "@/lib/hanulRules";
import type { MatchMethod, Member, Side } from "@/lib/types";

interface Entry {
  key: string;
  memberId: string | null;
  displayName: string;
  side?: Side;
  register?: boolean;
}

const STEPS = ["그룹명", "매칭 방식", "인원", "참가자", "확인"] as const;

const label = (m: Member) => (m.nickname ? `${m.name}(${m.nickname})` : m.name);

export function GroupWizard({
  tournamentId,
  members,
  takenMemberIds,
  defaultName,
  onClose,
  onCreated,
}: {
  tournamentId: string;
  members: Member[];
  takenMemberIds: Set<string>;
  defaultName: string;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [step, setStep] = useState(0);
  const [name, setName] = useState(defaultName);
  const [method, setMethod] = useState<MatchMethod>("HANUL_AA");
  const [size, setSize] = useState<number | null>(null);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [target, setTarget] = useState<Side>("A"); // AB 입력 대상 조
  const [query, setQuery] = useState("");
  const [guest, setGuest] = useState("");
  const [registerGuest, setRegisterGuest] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isAB = method === "HANUL_AB";
  const half = size ? size / 2 : 0;
  const countSide = (s: Side) => entries.filter((e) => e.side === s).length;
  const full = size !== null && (isAB ? countSide("A") === half && countSide("B") === half : entries.length === size);
  const targetFull = size !== null && (isAB ? countSide(target) >= half : entries.length >= size);

  const chosen = new Set(entries.map((e) => e.memberId).filter(Boolean));
  const available = useMemo(() => {
    const q = query.trim();
    return members.filter((m) => !takenMemberIds.has(m.id) && (!q || m.name.includes(q) || m.nickname?.includes(q)));
  }, [members, takenMemberIds, query]);

  function add(e: Omit<Entry, "key" | "side">) {
    if (targetFull) return;
    const side = isAB ? target : undefined;
    setEntries((prev) => [
      ...prev,
      { ...e, side, key: `${e.memberId ?? "g"}:${e.displayName}:${prev.length}:${Date.now()}` },
    ]);
    // AB: 한 조가 다 차면 다른 조로 자동 전환
    if (isAB && countSide(target) + 1 >= half) setTarget(target === "A" ? "B" : "A");
  }

  function addGuest() {
    const n = guest.trim();
    if (!n) return;
    if (entries.some((e) => !e.memberId && e.displayName === n)) {
      setError(`'${n}' 게스트가 이미 있습니다.`);
      return;
    }
    setError(null);
    add({ memberId: null, displayName: n, register: registerGuest });
    setGuest("");
  }

  async function create() {
    setBusy(true);
    setError(null);
    try {
      await api(`/api/tournaments/${tournamentId}/groups`, "POST", {
        name,
        method,
        size,
        entries: entries.map(({ memberId, displayName, side, register }) => ({
          memberId,
          displayName,
          side,
          register,
        })),
      });
      onCreated();
    } catch (e) {
      setError(e instanceof Error ? e.message : "생성 실패");
      setBusy(false);
    }
  }

  const canNext = [name.trim().length > 0, true, size !== null, full, true][step];

  const entryList = (side?: Side) => {
    const list = entries.filter((e) => e.side === side);
    const cap = isAB ? half : (size ?? 0);
    const active = !isAB || target === side;
    return (
      <div
        key={side ?? "all"}
        onClick={() => side && setTarget(side)}
        className={`rounded-2xl border p-4 shadow-xs transition ${
          isAB && active ? "border-primary bg-primary-soft ring-4 ring-primary/10" : "border-line bg-surface"
        } ${isAB ? "cursor-pointer" : ""}`}
      >
        <p className="flex justify-between text-sm font-semibold">
          <span>{side ? `${side}그룹 ${side === "A" ? "(숫자 번호)" : "(영문 번호)"}` : "참가자"}</span>
          <span className={`tabular ${list.length === cap ? "text-primary-text" : "text-muted"}`}>
            {list.length}/{cap}
          </span>
        </p>
        <ul className="mt-3 flex flex-wrap gap-1.5">
          {list.map((e) => (
            <li key={e.key}>
              <button
                onClick={(ev) => {
                  ev.stopPropagation();
                  setEntries((prev) => prev.filter((x) => x.key !== e.key));
                }}
                className="chip pr-2.5"
                aria-label={`${e.displayName} 제거`}
              >
                {e.displayName}
                {!e.memberId && <span className="text-xs text-muted">{e.register ? "신규" : "게스트"}</span>}
                <X className="size-3.5 text-muted" aria-hidden />
              </button>
            </li>
          ))}
          {list.length === 0 && (
            <li className="text-sm text-muted">{isAB ? "이 칸을 누른 뒤 아래에서 추가" : "아래에서 추가하세요"}</li>
          )}
        </ul>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-center bg-black/40 backdrop-blur-[2px]">
      <div role="dialog" aria-modal="true" aria-label="그룹 추가" className="flex w-full max-w-[480px] flex-col bg-bg">
        <header className="flex items-center justify-between px-4 pt-4">
          <div>
            <p className="text-xs font-medium text-muted">
              그룹 추가 · {step + 1}/{STEPS.length}
            </p>
            <h2 className="mt-0.5 text-xl font-bold tracking-tight">{STEPS[step]}</h2>
          </div>
          <button
            onClick={onClose}
            className="-mr-2 grid size-10 place-items-center rounded-full text-muted transition hover:bg-subtle hover:text-ink"
            aria-label="닫기"
          >
            <X className="size-5" />
          </button>
        </header>
        <div className="flex gap-1 px-4 pt-3 pb-1">
          {STEPS.map((s, i) => (
            <span key={s} className={`h-1 flex-1 rounded-full transition ${i <= step ? "bg-primary" : "bg-subtle"}`} />
          ))}
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-5">
          {step === 0 && (
            <label className="block">
              <span className="text-sm font-medium text-muted">그룹명</span>
              <input
                autoFocus
                value={name}
                placeholder="예: 금배조, 은배조"
                onChange={(e) => setName(e.target.value)}
                className="input mt-1.5 h-14 text-lg"
              />
            </label>
          )}

          {step === 1 && (
            <div className="space-y-3">
              {(
                [
                  ["HANUL_AA", "한울AA 방식", "단일 그룹 5~16명. 매 경기 파트너와 상대가 고르게 바뀝니다."],
                  [
                    "HANUL_AB",
                    "한울AB 방식",
                    "A/B 두 그룹(동수) 8·10·12·14·16명. 파트너는 항상 반대 그룹 선수입니다. (예: 혼복)",
                  ],
                ] as const
              ).map(([m, title, desc]) => (
                <button
                  key={m}
                  onClick={() => {
                    if (m !== method) {
                      setMethod(m);
                      setSize(null);
                      setEntries([]);
                    }
                  }}
                  className={`block w-full rounded-2xl border p-4 text-left shadow-xs transition active:scale-[0.99] ${
                    method === m
                      ? "border-primary bg-primary-soft ring-4 ring-primary/10"
                      : "border-line bg-surface hover:border-line-strong"
                  }`}
                  aria-pressed={method === m}
                >
                  <p className="text-base font-semibold">{title}</p>
                  <p className="mt-1 text-sm text-muted">{desc}</p>
                </button>
              ))}
            </div>
          )}

          {step === 2 && (
            <>
              <div className="grid grid-cols-4 gap-2">
                {SUPPORTED_SIZES[method].map((n) => (
                  <button
                    key={n}
                    onClick={() => {
                      setSize(n);
                      setEntries((prev) => (prev.length > n ? [] : prev));
                    }}
                    className={`tabular h-14 rounded-xl border text-lg font-semibold shadow-xs transition active:scale-95 ${
                      size === n
                        ? "border-primary bg-primary text-primary-fg shadow-primary/25"
                        : "border-line-strong bg-surface hover:bg-subtle"
                    }`}
                  >
                    {n}명
                  </button>
                ))}
              </div>
              {size && <p className="mt-4 text-sm text-muted">총 {size}경기 · 1인당 4경기</p>}
            </>
          )}

          {step === 3 && size && (
            <div className="space-y-3">
              {isAB ? (
                <>
                  {entryList("A")}
                  {entryList("B")}
                </>
              ) : (
                entryList()
              )}

              <div className="rounded-2xl border border-line bg-surface p-4 shadow-xs">
                <p className="text-sm font-semibold">
                  명부에서 불러오기{" "}
                  {isAB && <span className="font-medium text-primary-text">→ {target}그룹에 추가</span>}
                </p>
                <input
                  type="search"
                  placeholder="이름 검색"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="input mt-2 h-11"
                />
                <ul className="mt-3 flex max-h-56 flex-wrap gap-1.5 overflow-y-auto">
                  {available.map((m) => {
                    const picked = chosen.has(m.id);
                    return (
                      <li key={m.id}>
                        <button
                          disabled={picked || targetFull}
                          onClick={() => add({ memberId: m.id, displayName: label(m) })}
                          className={`chip ${picked ? "chip-on" : ""}`}
                        >
                          {picked && <Check className="size-3.5" aria-hidden />}
                          {label(m)}
                        </button>
                      </li>
                    );
                  })}
                  {available.length === 0 && <li className="text-sm text-muted">추가할 수 있는 회원이 없습니다.</li>}
                </ul>
                {takenMemberIds.size > 0 && (
                  <p className="mt-3 text-xs text-muted">이 대회의 다른 그룹에 참가 중인 회원은 표시되지 않습니다.</p>
                )}
              </div>

              <div className="rounded-2xl border border-line bg-surface p-4 shadow-xs">
                <p className="text-sm font-semibold">직접 입력 (게스트·신규)</p>
                <div className="mt-3 flex gap-2">
                  <input
                    value={guest}
                    placeholder="이름"
                    onChange={(e) => setGuest(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addGuest())}
                    className="input h-11 min-w-0 flex-1"
                  />
                  <Button className="min-h-11" disabled={!guest.trim() || targetFull} onClick={addGuest}>
                    추가
                  </Button>
                </div>
                <label className="mt-3 flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    className="size-5 accent-primary"
                    checked={registerGuest}
                    onChange={(e) => setRegisterGuest(e.target.checked)}
                  />
                  회원 명부에도 등록 (누적 통계에 포함)
                </label>
              </div>
            </div>
          )}

          {step === 4 && size && (
            <div className="space-y-3">
              <dl className="divide-y divide-line rounded-2xl border border-line bg-surface text-[15px] shadow-xs">
                {(
                  [
                    ["그룹", name],
                    ["방식", `${isAB ? "한울AB" : "한울AA"} · ${size}명`],
                    ["경기", `총 ${size}경기 (1인당 4경기)`],
                  ] as const
                ).map(([k, v]) => (
                  <div key={k} className="flex items-center justify-between px-4 py-3">
                    <dt className="text-sm text-muted">{k}</dt>
                    <dd className="font-medium">{v}</dd>
                  </div>
                ))}
              </dl>
              <Notice tone="info">
                <Shuffle className="mt-0.5 size-4 shrink-0" />
                생성하면 참가자 순번이 {isAB ? "A·B그룹 안에서 각각 " : ""}무작위로 배정되고 대진표가 만들어집니다.
              </Notice>
              <p className="px-1 text-sm text-muted">
                게스트 {entries.filter((e) => !e.memberId && !e.register).length}명은 누적 통계에 포함되지 않습니다.
              </p>
            </div>
          )}

          {error && (
            <div className="mt-4">
              <Notice tone="danger">{error}</Notice>
            </div>
          )}
        </div>

        <footer className="grid grid-cols-[auto_1fr] gap-2 border-t border-line bg-surface px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
          <Button variant="secondary" onClick={() => (step === 0 ? onClose() : setStep(step - 1))}>
            {step === 0 ? "취소" : "이전"}
          </Button>
          {step < STEPS.length - 1 ? (
            <Button disabled={!canNext} onClick={() => setStep(step + 1)}>
              다음
              {step === 3 && size && !full && ` (${isAB ? countSide("A") + countSide("B") : entries.length}/${size})`}
            </Button>
          ) : (
            <Button disabled={busy} onClick={create}>
              {busy ? (
                "생성 중…"
              ) : (
                <>
                  <Shuffle className="size-4" />
                  순번 배정 · 대진표 생성
                </>
              )}
            </Button>
          )}
        </footer>
      </div>
    </div>
  );
}
