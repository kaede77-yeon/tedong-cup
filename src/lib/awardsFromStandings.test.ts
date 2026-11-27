import { describe, expect, it } from "vitest";
import { awardsFromStandings } from "./awardsFromStandings";
import type { StandingRow, StandingTable } from "./standings";

/** "1:1,2:2,3:3" → code:rank 목록으로 순위표 행 생성 (모두 1경기 이상 치른 것으로) */
const rows = (spec: string, played = 1): StandingRow[] =>
  spec.split(",").map((s) => {
    const [code, rank] = s.split(":");
    return {
      code,
      memberId: null,
      displayName: `선수${code}`,
      rank: Number(rank),
      tied: false,
      played,
      wins: 0,
      losses: 0,
      pointsFor: 0,
      pointsAgainst: 0,
      diff: 0,
    };
  });
const aa = (spec: string, played = 1): StandingTable[] => [{ rows: rows(spec, played) }];

describe("awardsFromStandings — 한울AA", () => {
  it("1·2위 우승, 3·4위 준우승, 5·6위 3위", () => {
    const r = awardsFromStandings(aa("1:1,2:2,3:3,4:4,5:5,6:6,7:7"));
    expect(r.picks).toEqual({ winners: ["1", "2"], runnersUp: ["3", "4"], third: ["5", "6"] });
    expect(r.unresolved).toEqual([]);
  });

  it("같은 자리 안의 공동 순위는 문제없음 (공동 1위 2명 → 우승)", () => {
    const r = awardsFromStandings(aa("1:1,2:1,3:3,4:4,5:5,6:6"));
    expect(r.picks.winners).toEqual(["1", "2"]);
    expect(r.unresolved).toEqual([]);
  });

  it("공동 순위가 자리 경계에 걸리면 그 자리는 미정 (공동 2위 3명 → 우승·준우승 미정)", () => {
    const r = awardsFromStandings(aa("1:1,2:2,3:2,4:2,5:5,6:6,7:7"));
    expect(r.picks.winners).toEqual([]);
    expect(r.picks.runnersUp).toEqual([]);
    expect(r.picks.third).toEqual(["5", "6"]);
    expect(r.unresolved).toEqual(["winners", "runnersUp"]);
  });

  it("5명 그룹은 3위 자리가 1명뿐이라 3위 미정", () => {
    const r = awardsFromStandings(aa("1:1,2:2,3:3,4:4,5:5"));
    expect(r.picks.third).toEqual([]);
    expect(r.unresolved).toEqual(["third"]);
  });

  it("경기를 하나도 치르지 않았으면 모두 미정", () => {
    const r = awardsFromStandings(aa("1:1,2:1,3:1,4:1,5:1,6:1", 0));
    expect(r.unresolved).toEqual(["winners", "runnersUp", "third"]);
  });
});

describe("awardsFromStandings — 한울AB", () => {
  const ab = (a: string, b: string): StandingTable[] => [
    { side: "A", rows: rows(a) },
    { side: "B", rows: rows(b) },
  ];

  it("같은 순위의 A조·B조 선수가 한 팀 (1위끼리 우승 …)", () => {
    const r = awardsFromStandings(ab("1:1,2:2,3:3,4:4", "5:1,6:2,7:3,8:4"));
    expect(r.picks).toEqual({ winners: ["1", "5"], runnersUp: ["2", "6"], third: ["3", "7"] });
    expect(r.unresolved).toEqual([]);
  });

  it("한쪽 조라도 해당 순위가 공동이면 그 자리는 미정", () => {
    const r = awardsFromStandings(ab("1:1,2:2,3:2,4:4", "5:1,6:2,7:3,8:4"));
    expect(r.picks.winners).toEqual(["1", "5"]);
    expect(r.picks.runnersUp).toEqual([]);
    expect(r.picks.third).toEqual([]);
    expect(r.unresolved).toEqual(["runnersUp", "third"]);
  });
});
