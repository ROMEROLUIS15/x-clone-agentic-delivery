export interface TweetWithRelations {
  id: string;
  text: string;
  userId: string;
  createdAt: Date;
  user: {
    id: string;
    username: string;
    name: string;
    avatarUrl: string | null;
  };
  _count: { likes: number };
  likes?: { id: string }[];
}

export function toTweetDTO(tweet: TweetWithRelations) {
  return {
    id: tweet.id,
    text: tweet.text,
    userId: tweet.userId,
    createdAt: tweet.createdAt,
    user: tweet.user,
    likesCount: tweet._count.likes,
    liked: (tweet.likes?.length ?? 0) > 0,
  };
}

export const tweetIncludeFor = (currentUserId: string) => ({
  user: {
    select: { id: true, username: true, name: true, avatarUrl: true },
  },
  _count: { select: { likes: true } },
  likes: {
    where: { userId: currentUserId },
    select: { id: true },
  },
});
