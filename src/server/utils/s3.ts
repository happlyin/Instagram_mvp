import AWS from 'aws-sdk'

// Localstack 설정
const s3Config = {
  endpoint: process.env.AWS_ENDPOINT || 'http://localhost:4566',
  region: process.env.AWS_REGION || 'us-east-1',
  accessKeyId: process.env.AWS_ACCESS_KEY_ID || 'test',
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || 'test',
  s3ForcePathStyle: true, // Localstack에 필요
  signatureVersion: 'v4',
}

export const s3Client = new AWS.S3(s3Config)

export const BUCKET_NAME = process.env.S3_BUCKET_NAME || 'instagram-mvp-uploads'

/**
 * S3에 파일 업로드
 */
export const uploadToS3 = async (
  file: Buffer,
  fileName: string,
  contentType: string
): Promise<string> => {
  const params = {
    Bucket: BUCKET_NAME,
    Key: fileName,
    Body: file,
    ContentType: contentType,
  }

  const result = await s3Client.upload(params).promise()
  return result.Location
}

/**
 * S3에서 파일 삭제
 */
export const deleteFromS3 = async (fileName: string): Promise<void> => {
  const params = {
    Bucket: BUCKET_NAME,
    Key: fileName,
  }

  await s3Client.deleteObject(params).promise()
}

/**
 * S3 버킷 생성 (개발 환경용)
 */
export const createBucketIfNotExists = async (): Promise<void> => {
  try {
    await s3Client.headBucket({ Bucket: BUCKET_NAME }).promise()
    console.log(`✅ S3 Bucket '${BUCKET_NAME}' already exists`)
  } catch (error) {
    try {
      await s3Client.createBucket({ Bucket: BUCKET_NAME }).promise()
      console.log(`✅ S3 Bucket '${BUCKET_NAME}' created successfully`)
    } catch (createError) {
      console.error('❌ Error creating S3 bucket:', createError)
    }
  }
}
