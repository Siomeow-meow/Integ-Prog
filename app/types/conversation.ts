export interface Message {
  id: number;
  conversation: number;
  senderId: string;
  sender: {
    userName: string;
    profileImg: string;
  };
  content: string;
  createdAt: string;
  replies: Message[];
}

export default interface Conversation {
  id: number;
  isGroup: boolean;
  participants: {
    id: string;
    userName: string;
    profileImg: string;
  };
  messages: Message[];
}
