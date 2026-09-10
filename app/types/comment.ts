export default interface Comment {
  id: number;
  postId: number;
  commenterId: string;

  commenter: {
    userName: string;
    profileImg: string;
  };

  content: string;
  createdAt: string;

  likesCount: number;
  isLiked: boolean;

  parentId: number | null;
  replies: Comment[];
}
