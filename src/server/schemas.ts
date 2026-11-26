import { z } from "zod";

const name = z.string().trim().min(1, "이름을 입력해 주세요.").max(30);
const dateStr = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "날짜 형식은 YYYY-MM-DD 입니다.");
const code = z.string().regex(/^[1-9A-H]$/);

export const loginSchema = z.object({ password: z.string().min(1) });

export const memberCreateSchema = z.object({
  name,
  nickname: z.string().trim().max(30).optional(),
});

export const memberPatchSchema = z.object({
  name: name.optional(),
  nickname: z.string().trim().max(30).optional(),
  isActive: z.boolean().optional(),
});

export const tournamentCreateSchema = z.object({
  date: dateStr,
  title: z.string().trim().max(50).optional(),
});

export const tournamentPatchSchema = z.object({
  date: dateStr.optional(),
  title: z.string().trim().min(1).max(50).optional(),
});

export const groupCreateSchema = z.object({
  name: z.string().trim().min(1, "그룹명을 입력해 주세요.").max(20),
  method: z.enum(["HANUL_AA", "HANUL_AB"]),
  size: z.number().int().min(5).max(16),
  entries: z
    .array(
      z.object({
        memberId: z.string().nullable(),
        displayName: z.string().trim().min(1).max(30),
        side: z.enum(["A", "B"]).optional(),
        register: z.boolean().optional(),
      }),
    )
    .min(5)
    .max(16),
});

export const scoreSchema = z.union([
  z.object({ scoreA: z.number().int(), scoreB: z.number().int() }),
  z.null(),
]);

export const completeSchema = z.object({
  awards: z.record(
    z.string(),
    z.object({
      winners: z.tuple([code, code]),
      runnersUp: z.tuple([code, code]),
      third: z.tuple([code, code]).optional(),
    }),
  ),
});
