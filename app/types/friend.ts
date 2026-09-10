export default interface Friend {
  id: number;
  createdAt: string;
  status: string;
  otherUser: {
    id: string;
    userName: string;
    profileImg: string;
  };
}
