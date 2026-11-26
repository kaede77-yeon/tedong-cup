import "server-only";
import { MongoClient, type Db } from "mongodb";
import { env } from "./env";

// Vercel 서버리스에서 커넥션 누수를 막기 위해 MongoClient를 전역 싱글톤으로 캐싱한다.
// (개발 모드 HMR에서도 모듈이 재평가되므로 globalThis에 보관)
const g = globalThis as typeof globalThis & {
  _mongoClientPromise?: Promise<MongoClient>;
  _mongoIndexesReady?: Promise<void>;
};

function clientPromise(): Promise<MongoClient> {
  if (!g._mongoClientPromise) {
    const client = new MongoClient(env.mongoUri, { maxPoolSize: 10 });
    g._mongoClientPromise = client.connect().catch((e) => {
      g._mongoClientPromise = undefined; // 실패 시 다음 요청에서 재시도
      throw e;
    });
  }
  return g._mongoClientPromise;
}

const DEFAULT_DB = "tedong";

export async function getDb(): Promise<Db> {
  const client = await clientPromise();
  // 연결 문자열에 DB 이름이 있으면 그것을, 없으면 기본값 사용
  const db = client.db(client.options.dbName || DEFAULT_DB);
  g._mongoIndexesReady ??= ensureIndexes(db).catch((e) => {
    g._mongoIndexesReady = undefined;
    throw e;
  });
  await g._mongoIndexesReady;
  return db;
}

export async function ensureIndexes(db: Db): Promise<void> {
  await Promise.all([
    db.collection("members").createIndex({ name: 1, nickname: 1 }, { unique: true }),
    db.collection("tournaments").createIndex({ date: -1 }),
    db.collection("groups").createIndex({ tournamentId: 1, order: 1 }),
    db.collection("groups").createIndex({ "participants.memberId": 1 }),
  ]);
}

/** 테스트에서 메모리 DB 클라이언트를 주입할 때 사용 */
export function __setClientForTest(client: MongoClient | undefined): void {
  g._mongoClientPromise = client ? Promise.resolve(client) : undefined;
  g._mongoIndexesReady = undefined;
}
