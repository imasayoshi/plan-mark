import { type ClientSchema, a, defineData } from "@aws-amplify/backend";

const schema = a.schema({
  Document: a
    .model({
      name: a.string(), // 図面名
      fileKey: a.string(), // S3ファイルキー
      annotations: a.hasMany("Annotation", "documentId"), // 関連コメント
      shapes: a.hasMany("Shape", "documentId"), // 関連図形
    })
    .authorization((allow) => [allow.guest()]),

  Annotation: a
    .model({
      documentId: a.id(), // 図面ID
      document: a.belongsTo("Document", "documentId"), // 所属図面
      pageNumber: a.integer(), // ページ番号
      content: a.string(), // コメント内容
      x: a.float(), // X座標
      y: a.float(), // Y座標
      leaderX: a.float(), // リーダー線終点X座標
      leaderY: a.float(), // リーダー線終点Y座標
      width: a.float(), // アノテーション幅
      height: a.float(), // アノテーション高さ
    })
    .authorization((allow) => [allow.guest()]),

  Shape: a
    .model({
      documentId: a.id(), // 図面ID
      document: a.belongsTo("Document", "documentId"), // 所属図面
      pageNumber: a.integer(), // ページ番号
      type: a.enum(["rectangle", "circle", "arrow", "polygon"]), // 図形種別
      x: a.float(), // X座標
      y: a.float(), // Y座標
      color: a.string().default("#3b82f6"), // 色
      strokeWidth: a.float().default(2), // 線の太さ
      properties: a.json(), // 図形固有プロパティ（width, height, radius, endX, endY, points等）
    })
    .authorization((allow) => [allow.guest()]),
});

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: "identityPool",
  },
});
