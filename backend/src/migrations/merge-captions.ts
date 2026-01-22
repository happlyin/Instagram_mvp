/**
 * 기존 캡션들을 합치는 마이그레이션 스크립트
 *
 * 실행 방법:
 * npx ts-node src/migrations/merge-captions.ts
 *
 * 동작:
 * 1. 각 포스트의 모든 캡션을 orderIndex 순서로 가져옴
 * 2. 캡션 텍스트를 줄바꿈으로 합침
 * 3. 첫 번째 캡션의 스타일(isBold, isItalic, fontSize)을 유지
 * 4. 첫 번째 캡션만 남기고 나머지 삭제
 */

import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';

dotenv.config();

const dataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_DATABASE || 'instagram_mvp',
});

async function mergeCaptions() {
  try {
    await dataSource.initialize();
    console.log('데이터베이스 연결 성공');

    const queryRunner = dataSource.createQueryRunner();

    // 1. 여러 캡션을 가진 포스트 조회
    const postsWithMultipleCaptions = await queryRunner.query(`
      SELECT "postId", COUNT(*) as caption_count
      FROM post_captions
      GROUP BY "postId"
      HAVING COUNT(*) > 1
    `);

    console.log(`처리할 포스트 수: ${postsWithMultipleCaptions.length}`);

    for (const { postId, caption_count } of postsWithMultipleCaptions) {
      console.log(`포스트 ${postId} 처리 중... (캡션 ${caption_count}개)`);

      // 2. 해당 포스트의 모든 캡션을 orderIndex 순서로 가져오기
      const captions = await queryRunner.query(`
        SELECT id, text, "orderIndex", "isBold", "isItalic", "fontSize"
        FROM post_captions
        WHERE "postId" = $1
        ORDER BY "orderIndex" ASC
      `, [postId]);

      if (captions.length === 0) continue;

      // 3. 캡션 텍스트 합치기 (줄바꿈으로 연결)
      const mergedText = captions.map((c: any) => c.text).join('\n');

      // 4. 첫 번째 캡션의 스타일 유지, 텍스트 업데이트
      const firstCaption = captions[0];
      await queryRunner.query(`
        UPDATE post_captions
        SET text = $1, "orderIndex" = 0
        WHERE id = $2
      `, [mergedText, firstCaption.id]);

      // 5. 나머지 캡션 삭제
      const captionIdsToDelete = captions.slice(1).map((c: any) => c.id);
      if (captionIdsToDelete.length > 0) {
        await queryRunner.query(`
          DELETE FROM post_captions
          WHERE id = ANY($1)
        `, [captionIdsToDelete]);
      }

      console.log(`포스트 ${postId}: ${captions.length}개 캡션 → 1개로 합침`);
    }

    console.log('마이그레이션 완료!');
    await dataSource.destroy();
  } catch (error) {
    console.error('마이그레이션 실패:', error);
    process.exit(1);
  }
}

mergeCaptions();
