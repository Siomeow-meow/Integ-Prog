export default interface Post {
  id: number;
  userId: string;
  authorId: string;
  author: {
    userName: string;
    profileImg: string;
  };
  title: string;
  subject: string;
  content: string;
  images: string[];
  tags: string[];
  isAnonymous?: boolean;
  createdAt: string;
  groupId: number | null;
  status: "published" | "draft" | "archived";
  likesCount: number;
  isLiked: boolean;
  commentsCount?: number;
}
