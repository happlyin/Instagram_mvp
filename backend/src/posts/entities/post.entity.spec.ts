import { Post } from './post.entity';
import { PostImage } from './post-image.entity';
import { PostCaption } from './post-caption.entity';

describe('Post Entity', () => {
  describe('Post', () => {
    it('should create a post instance', () => {
      const post = new Post();
      post.id = 'test-uuid';
      post.userId = 'user-uuid';
      post.images = [];
      post.captions = [];
      post.createdAt = new Date();
      post.updatedAt = new Date();

      expect(post).toBeDefined();
      expect(post.id).toBe('test-uuid');
      expect(post.userId).toBe('user-uuid');
      expect(post.images).toEqual([]);
      expect(post.captions).toEqual([]);
    });

    it('should have one-to-many relationship with images', () => {
      const post = new Post();
      const image1 = new PostImage();
      const image2 = new PostImage();

      image1.id = 'image-1';
      image1.orderIndex = 0;
      image2.id = 'image-2';
      image2.orderIndex = 1;

      post.images = [image1, image2];

      expect(post.images.length).toBe(2);
      expect(post.images[0].orderIndex).toBe(0);
      expect(post.images[1].orderIndex).toBe(1);
    });

    it('should have one-to-many relationship with captions', () => {
      const post = new Post();
      const caption1 = new PostCaption();
      const caption2 = new PostCaption();

      caption1.id = 'caption-1';
      caption1.orderIndex = 0;
      caption1.text = 'First caption';
      caption2.id = 'caption-2';
      caption2.orderIndex = 1;
      caption2.text = 'Second caption';

      post.captions = [caption1, caption2];

      expect(post.captions.length).toBe(2);
      expect(post.captions[0].text).toBe('First caption');
      expect(post.captions[1].text).toBe('Second caption');
    });
  });

  describe('PostImage', () => {
    it('should create a post image instance', () => {
      const image = new PostImage();
      image.id = 'image-uuid';
      image.postId = 'post-uuid';
      image.imageUrl = 'https://minio.local/bucket/image.jpg';
      image.orderIndex = 0;
      image.originalFileName = 'photo.jpg';
      image.mimeType = 'image/jpeg';
      image.fileSize = 1024000;

      expect(image).toBeDefined();
      expect(image.imageUrl).toBe('https://minio.local/bucket/image.jpg');
      expect(image.orderIndex).toBe(0);
      expect(image.mimeType).toBe('image/jpeg');
    });

    it('should allow orderIndex from 0 to 8 (max 9 images)', () => {
      const images: PostImage[] = [];

      for (let i = 0; i < 9; i++) {
        const image = new PostImage();
        image.orderIndex = i;
        images.push(image);
      }

      expect(images.length).toBe(9);
      expect(images[0].orderIndex).toBe(0);
      expect(images[8].orderIndex).toBe(8);
    });
  });

  describe('PostCaption', () => {
    it('should create a post caption instance with default values', () => {
      const caption = new PostCaption();
      caption.id = 'caption-uuid';
      caption.postId = 'post-uuid';
      caption.text = 'Hello World!';
      caption.orderIndex = 0;
      caption.isBold = false;
      caption.isItalic = false;
      caption.fontSize = 14;

      expect(caption).toBeDefined();
      expect(caption.text).toBe('Hello World!');
      expect(caption.isBold).toBe(false);
      expect(caption.isItalic).toBe(false);
      expect(caption.fontSize).toBe(14);
    });

    it('should allow style customization', () => {
      const caption = new PostCaption();
      caption.text = 'Styled caption';
      caption.isBold = true;
      caption.isItalic = true;
      caption.fontSize = 24;

      expect(caption.isBold).toBe(true);
      expect(caption.isItalic).toBe(true);
      expect(caption.fontSize).toBe(24);
    });

    it('should allow orderIndex from 0 to 4 (max 5 captions)', () => {
      const captions: PostCaption[] = [];

      for (let i = 0; i < 5; i++) {
        const caption = new PostCaption();
        caption.orderIndex = i;
        caption.text = `Caption ${i + 1}`;
        captions.push(caption);
      }

      expect(captions.length).toBe(5);
      expect(captions[0].orderIndex).toBe(0);
      expect(captions[4].orderIndex).toBe(4);
    });
  });
});
