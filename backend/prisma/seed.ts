import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  await prisma.like.deleteMany();
  await prisma.follow.deleteMany();
  await prisma.tweet.deleteMany();
  await prisma.user.deleteMany();

  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash("password123", salt);

  const usersData = [
    { email: "user1@example.com", username: "carlosg", name: "Carlos García", bio: "Full-stack developer and coffee enthusiast. Building the future one commit at a time.", avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=carlosg" },
    { email: "user2@example.com", username: "marialopez", name: "María López", bio: "UX designer turned frontend dev. Pixel perfectionist. She/her.", avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=marialopez" },
    { email: "user3@example.com", username: "alexkim", name: "Alex Kim", bio: "DevOps engineer by day, indie game dev by night. Rust & TypeScript.", avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=alexkim" },
    { email: "user4@example.com", username: "sarahchen", name: "Sarah Chen", bio: "Data scientist @ BigCo. ML, NLP, and all things AI. Opinions are my own.", avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=sarahchen" },
    { email: "user5@example.com", username: "jameswilson", name: "James Wilson", bio: "Open source maintainer. Rust enthusiast. Writing code that lasts.", avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=jameswilson" },
    { email: "user6@example.com", username: "anamartinez", name: "Ana Martínez", bio: "Mobile dev (Flutter & Kotlin). Love hiking, photography, and good coffee.", avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=anamartinez" },
    { email: "user7@example.com", username: "davidpark", name: "David Park", bio: "Security researcher. CTF player. Breaking things so others don't have to.", avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=davidpark" },
    { email: "user8@example.com", username: "lisawang", name: "Lisa Wang", bio: "Product manager @ StartupX. Former engineer. Building products people love.", avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=lisawang" },
    { email: "user9@example.com", username: "robertosilva", name: "Roberto Silva", bio: "Backend engineer. Distributed systems, databases, and scalability. Tweets in EN/ES.", avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=robertosilva" },
    { email: "user10@example.com", username: "emmajohnson", name: "Emma Johnson", bio: "Tech journalist & developer advocate. Writing about the people behind the code.", avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=emmajohnson" },
    { email: "user11@example.com", username: "mohamedali", name: "Mohamed Ali", bio: "Cloud architect (AWS, GCP). Serverless believer. Father of two.", avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=mohamedali" },
    { email: "user12@example.com", username: "yukitanaka", name: "Yuki Tanaka", bio: "Frontend engineer. React, Vue, and design systems. 日本語 / English.", avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=yukitanaka" },
  ];

  const users = await Promise.all(
    usersData.map((u) =>
      prisma.user.create({
        data: { ...u, passwordHash },
      })
    )
  );

  const tweetsData = [
    { userId: users[0].id, text: "Just deployed a new microservice architecture. The refactor was painful but the result is beautiful. #cleanCode #architecture" },
    { userId: users[0].id, text: "Coffee count today: 4. Productivity: questionable. But the code works, so I call that a win." },
    { userId: users[0].id, text: "Hot take: tabs > spaces. I said what I said. Come at me, bro." },
    { userId: users[1].id, text: "Spent the whole day tweaking a button shadow. No regrets. Design is in the details ✨" },
    { userId: users[1].id, text: "Just discovered CSS container queries. This changes everything for responsive design." },
    { userId: users[1].id, text: "User research today confirmed something I always suspected: users never read, they just scan. Design accordingly." },
    { userId: users[2].id, text: "Finally got my Kubernetes cluster to auto-scale properly. Only took three all-nighters. #devops #kubernetes" },
    { userId: users[2].id, text: "Rust's borrow checker is tough love, but man does it result in solid code. Never going back." },
    { userId: users[2].id, text: "Building a game engine in Rust for fun. Current feature: rendering a triangle. Living the dream.", imageUrl: "https://picsum.photos/seed/gameengine/600/400" },
    { userId: users[3].id, text: "New paper on transformer efficiency just dropped. The compute savings are insane. #AI #MachineLearning" },
    { userId: users[3].id, text: "My model just hit 97% accuracy on the validation set. Time to celebrate with copious amounts of tea. 🍵" },
    { userId: users[3].id, text: "Data cleaning is 80% of the work and 0% of the glory. But someone has to do it." },
    { userId: users[4].id, text: "Just contributed my first PR to the Rust compiler. Feeling like I've leveled up. 🦀" },
    { userId: users[4].id, text: "Open source isn't just about code. It's about community, mentorship, and building things together." },
    { userId: users[4].id, text: "Who else spends more time writing tests than actual features? Just me? Okay." },
    { userId: users[5].id, text: "Flutter 4.0 is amazing. The new rendering engine is buttery smooth. #flutter #mobile" },
    { userId: users[5].id, text: "Hiked 15 miles today to clear my head. Came back and fixed a bug in 5 minutes. Nature is the best debugger.", imageUrl: "https://picsum.photos/seed/hiking/600/400" },
    { userId: users[5].id, text: "Kotlin Multiplatform is the future of mobile dev. Write once, run everywhere, cry about configuration." },
    { userId: users[6].id, text: "Found a zero-day in a popular npm package. Responsible disclosure timeline starts now. #infosec" },
    { userId: users[6].id, text: "CTF this weekend was brutal. Sixteen hours of non-stop hacking. We placed 3rd. Not bad." },
    { userId: users[6].id, text: "Security is not a feature. It's a mindset. Every line of code is an attack surface." },
    { userId: users[7].id, text: "Ship fast, but ship quality. You can have both if you invest in the right processes." },
    { userId: users[7].id, text: "Great product managers don't just write specs. They understand the tech, the users, and the business." },
    { userId: users[7].id, text: "Roadmap planning season is upon us. Time to triage a hundred feature requests down to ten." },
    { userId: users[8].id, text: "PostgreSQL performance tuning is an art form. Today I optimized a query from 12 seconds to 30ms." },
    { userId: users[8].id, text: "Distributed systems are just regular systems that fail in more interesting ways." },
    { userId: users[8].id, text: "My hot take: NoSQL databases have their place, but 90% of apps are better off with Postgres." },
    { userId: users[9].id, text: "Interviewed a dev who wrote their first line of code at age 6. Meanwhile I was still eating paste. #humbled" },
    { userId: users[9].id, text: "The tech industry moves too fast. Sometimes you need to pause and appreciate how far we've come." },
    { userId: users[9].id, text: "New blog post: 'The Human Side of Software Engineering'. Link in bio. Would love your thoughts." },
    { userId: users[10].id, text: "Migrated our entire infrastructure to serverless. Costs down 60%, team morale up 200%. #AWS #serverless", imageUrl: "https://picsum.photos/seed/serverless/600/400" },
    { userId: users[10].id, text: "Terraform is great until you accidentally delete a production resource. Thank goodness for state backups." },
    { userId: users[10].id, text: "Cloud bills are like horror stories. 'I thought I turned off that instance two months ago...'" },
    { userId: users[11].id, text: "Design systems are the unsung heroes of frontend development. Consistency at scale is beautiful." },
    { userId: users[11].id, text: "React Server Components are genuinely game-changing. The lines between server and client blur beautifully." },
    { userId: users[11].id, text: "日本語でコードを書くのは初めての挑戦です。Unicode variable names should be more common in global teams." },
  ];

  const tweets = await Promise.all(
    tweetsData.map((t) =>
      prisma.tweet.create({ data: t })
    )
  );

  const followPairs: [number, number][] = [
    [0, 1], [0, 2], [0, 3], [0, 4], [0, 5],
    [1, 0], [1, 2], [1, 6], [1, 7],
    [2, 0], [2, 4], [2, 8], [2, 10],
    [3, 0], [3, 1], [3, 5], [3, 9],
    [4, 0], [4, 2], [4, 6], [4, 11],
    [5, 1], [5, 3], [5, 7], [5, 11],
    [6, 0], [6, 2], [6, 8], [6, 9],
    [7, 1], [7, 3], [7, 4], [7, 10],
    [8, 0], [8, 4], [8, 6], [8, 11],
    [9, 2], [9, 3], [9, 5], [9, 7],
    [10, 0], [10, 2], [10, 6], [10, 8],
    [11, 1], [11, 4], [11, 7], [11, 9],
  ];

  await Promise.all(
    followPairs.map(([followerIdx, followingIdx]) =>
      prisma.follow.create({
        data: {
          followerId: users[followerIdx].id,
          followingId: users[followingIdx].id,
        },
      })
    )
  );

  const likePairs: [number, number][] = [
    [0, 3], [0, 6], [0, 9], [0, 15], [0, 18], [0, 27],
    [1, 0], [1, 4], [1, 7], [1, 12], [1, 21], [1, 30],
    [2, 1], [2, 5], [2, 10], [2, 13], [2, 22], [2, 33],
    [3, 2], [3, 8], [3, 11], [3, 16], [3, 25], [3, 34],
    [4, 0], [4, 3], [4, 12], [4, 17], [4, 24], [4, 35],
    [5, 1], [5, 6], [5, 14], [5, 19], [5, 26], [5, 31],
    [6, 2], [6, 7], [6, 15], [6, 20], [6, 25], [6, 29],
    [7, 4], [7, 9], [7, 13], [7, 18], [7, 28], [7, 32],
    [8, 0], [8, 5], [8, 10], [8, 16], [8, 21], [8, 33],
    [9, 3], [9, 8], [9, 11], [9, 19], [9, 24], [9, 34],
    [10, 1], [10, 6], [10, 14], [10, 20], [10, 27], [10, 30],
    [11, 2], [11, 7], [11, 12], [11, 17], [11, 22], [11, 35],
  ];

  await Promise.all(
    likePairs.map(([userIdx, tweetIdx]) =>
      prisma.like.create({
        data: {
          userId: users[userIdx].id,
          tweetId: tweets[tweetIdx].id,
        },
      })
    )
  );

  // Replies (threaded conversations). Each entry: [authorIdx, parentTweetIdx, text].
  // Created sequentially so timestamps reflect a natural conversation order.
  const repliesData: [number, number, string][] = [
    [1, 0, "This is gold. Did you go with an event-driven approach or sync calls between services?"],
    [0, 0, "@marialopez mostly event-driven with a message queue. Sync only where strong consistency was a must."],
    [8, 0, "The painful refactors are always the ones worth doing. Congrats on shipping it!"],
    [2, 2, "Tabs supremacy! Finally someone with good taste. 🙌"],
    [3, 2, "Hard disagree but I respect the confidence. 😄"],
    [11, 4, "Container queries changed my whole approach to component-driven design. Welcome to the club!"],
    [5, 7, "The borrow checker fights you until the day it suddenly clicks. Then you miss it everywhere else."],
    [2, 7, "@jameswilson exactly this. I write better C++ now just from thinking in Rust terms."],
    [9, 24, "30ms is a thing of beauty. Was it an index, or did you rewrite the query plan?"],
    [8, 24, "@robertosilva a composite index plus killing an accidental N+1. Classic combo."],
    [3, 10, "Congrats! What dataset were you benchmarking against?"],
    [10, 30, "60% cost reduction is huge. How did the cold starts affect your latency budget?"],
  ];

  const replies = [];
  for (const [authorIdx, parentIdx, text] of repliesData) {
    const reply = await prisma.tweet.create({
      data: {
        userId: users[authorIdx].id,
        text,
        parentId: tweets[parentIdx].id,
      },
    });
    replies.push(reply);
  }

  console.log("Database seeded successfully!");
  console.log(`  - ${users.length} users created`);
  console.log(`  - ${tweets.length} tweets created`);
  console.log(`  - ${replies.length} replies created`);
  console.log(`  - ${followPairs.length} follows created`);
  console.log(`  - ${likePairs.length} likes created`);
  console.log("\nTest credentials:");
  console.log("  Email: user1@example.com");
  console.log("  Password: password123");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
