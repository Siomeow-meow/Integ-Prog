export default interface Group {
  id: number;
  groupName: string;
  description: string;
  groupImg: string;
  bannerImg: string;
  groupThemes: string[];
  allowAnonymity: boolean;
  populationCount: number;
  isFollowed: boolean;
  isAdmin: boolean;
  posts: { id: number };
  groupMembers: {
    id: string;
    userName: string;
    profileImg: string;
  }[];
}
