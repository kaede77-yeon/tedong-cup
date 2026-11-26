"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import useSWR from "swr";
import { TournamentView } from "@/components/TournamentView";
import { Button } from "@/components/ui";
import { api, fetcher } from "@/lib/client";
import type { Member } from "@/lib/types";
import type { TournamentDetail } from "@/server/repo";
import { CompleteDialog } from "./CompleteDialog";
import { GroupWizard } from "./GroupWizard";

export function AdminTournament({ initial, members }: { initial: TournamentDetail; members: Member[] }) {
  const router = useRouter();
  const key = `/api/tournaments/${initial.tournament.id}`;
  // TournamentView와 같은 키를 공유 → mutate 시 함께 갱신
  const { data, mutate } = useSWR<TournamentDetail>(key, fetcher, { fallbackData: initial });
  const detail = data ?? initial;
  const { tournament, groups } = detail;
  const open = tournament.status === "IN_PROGRESS";
  const anyScore = groups.some((g) => g.playedCount > 0);

  const [wizard, setWizard] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function act(fn: () => Promise<unknown>) {
    setError(null);
    try {
      await fn();
      await mutate();
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "실패");
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between px-4 pt-3">
        <Link href="/admin" className="text-sm font-bold text-court">
          ← 대회 목록
        </Link>
        <Link href={`/tournaments/${tournament.id}`} className="text-sm font-bold text-muted underline">
          공개 화면 보기
        </Link>
      </div>

      {open ? (
        <p className="mx-4 mt-2 rounded-lg bg-court-light px-3 py-2 text-sm font-bold text-court">
          ✏️ 경기 카드를 누르면 점수를 입력/수정할 수 있습니다.
        </p>
      ) : (
        <p className="mx-4 mt-2 rounded-lg bg-gray-100 px-3 py-2 text-sm font-bold text-muted">
          🔒 종료된 대회입니다. 수정하려면 아래에서 잠금을 해제하세요.
        </p>
      )}
      {error && <p className="mx-4 mt-2 rounded-lg bg-red-50 p-3 font-bold text-red-700">{error}</p>}

      <TournamentView
        initial={detail}
        admin
        groupActions={(g) =>
          open && g.playedCount === 0 ? (
            <Button
              variant="ghost"
              className="w-full text-red-700"
              onClick={() => confirm(`'${g.name}' 그룹을 삭제할까요?`) && act(() => api(`/api/groups/${g.id}`, "DELETE"))}
            >
              이 그룹 삭제 (점수 입력 전에만 가능)
            </Button>
          ) : null
        }
      />

      <div className="space-y-2 px-4 pt-4">
        {open && (
          <>
            <Button variant="secondary" className="w-full" onClick={() => setWizard(true)}>
              ＋ 그룹 추가
            </Button>
            {groups.length > 0 && (
              <Button className="w-full" onClick={() => setCompleting(true)}>
                🏁 대회 종료 · 수상자 확정
              </Button>
            )}
            {!anyScore && (
              <Button
                variant="ghost"
                className="w-full text-red-700"
                onClick={() =>
                  confirm("대회를 삭제할까요? 모든 그룹이 함께 삭제됩니다.") &&
                  act(async () => {
                    await api(`/api/tournaments/${tournament.id}`, "DELETE");
                    router.replace("/admin");
                  })
                }
              >
                대회 삭제
              </Button>
            )}
          </>
        )}
        {!open && (
          <Button
            variant="secondary"
            className="w-full"
            onClick={() =>
              confirm("잠금을 해제하면 점수를 수정할 수 있고, 다시 종료할 때까지 통계·명예의 전당에서 제외됩니다. 해제할까요?") &&
              act(() => api(`/api/tournaments/${tournament.id}/reopen`, "POST"))
            }
          >
            🔓 잠금 해제
          </Button>
        )}
      </div>

      {wizard && (
        <GroupWizard
          tournamentId={tournament.id}
          members={members}
          takenMemberIds={new Set(groups.flatMap((g) => g.participants.map((p) => p.memberId).filter((x): x is string => !!x)))}
          defaultName={groups.length === 0 ? "금배조" : groups.length === 1 ? "은배조" : ""}
          onClose={() => setWizard(false)}
          onCreated={() => {
            setWizard(false);
            act(async () => {});
          }}
        />
      )}
      {completing && (
        <CompleteDialog
          detail={detail}
          onClose={() => setCompleting(false)}
          onDone={() => {
            setCompleting(false);
            act(async () => {});
          }}
        />
      )}
    </div>
  );
}
