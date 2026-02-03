# SeeMe Database Commands Reference

Run all commands from the `backend` folder:
```bash
cd C:\Users\HP\Desktop\Richy-coding-hub-2026\SeeMe\backend
```

---

## Quick View Commands

### View All Users
```bash
npx ts-node -e "const{Sequelize}=require('sequelize');const db=new Sequelize({dialect:'sqlite',storage:'./data/seeme.db',logging:false});db.query('SELECT id, username, email, created_at FROM users ORDER BY created_at DESC').then(([r])=>{console.table(r);process.exit(0)})"
```

### View All Posts
```bash
npx ts-node -e "const{Sequelize}=require('sequelize');const db=new Sequelize({dialect:'sqlite',storage:'./data/seeme.db',logging:false});db.query('SELECT id, user_id, content, created_at FROM posts ORDER BY created_at DESC').then(([r])=>{console.table(r);process.exit(0)})"
```

### View All Follows (Friends)
```bash
npx ts-node -e "const{Sequelize}=require('sequelize');const db=new Sequelize({dialect:'sqlite',storage:'./data/seeme.db',logging:false});db.query('SELECT f.id, u1.username as follower, u2.username as following, f.created_at FROM follows f JOIN users u1 ON f.follower_id=u1.id JOIN users u2 ON f.following_id=u2.id').then(([r])=>{console.table(r);process.exit(0)})"
```

### View All Comments
```bash
npx ts-node -e "const{Sequelize}=require('sequelize');const db=new Sequelize({dialect:'sqlite',storage:'./data/seeme.db',logging:false});db.query('SELECT * FROM comments ORDER BY created_at DESC').then(([r])=>{console.table(r);process.exit(0)})"
```

### View All Likes
```bash
npx ts-node -e "const{Sequelize}=require('sequelize');const db=new Sequelize({dialect:'sqlite',storage:'./data/seeme.db',logging:false});db.query('SELECT * FROM likes ORDER BY created_at DESC').then(([r])=>{console.table(r);process.exit(0)})"
```

### View All Messages
```bash
npx ts-node -e "const{Sequelize}=require('sequelize');const db=new Sequelize({dialect:'sqlite',storage:'./data/seeme.db',logging:false});db.query('SELECT * FROM messages ORDER BY created_at DESC LIMIT 50').then(([r])=>{console.table(r);process.exit(0)})"
```

### View All Conversations
```bash
npx ts-node -e "const{Sequelize}=require('sequelize');const db=new Sequelize({dialect:'sqlite',storage:'./data/seeme.db',logging:false});db.query('SELECT * FROM conversations ORDER BY updated_at DESC').then(([r])=>{console.table(r);process.exit(0)})"
```

---

## Schema & Structure Commands

### List All Tables
```bash
npx ts-node -e "const{Sequelize}=require('sequelize');const db=new Sequelize({dialect:'sqlite',storage:'./data/seeme.db',logging:false});db.query(\"SELECT name FROM sqlite_master WHERE type='table' ORDER BY name\").then(([r])=>{console.table(r);process.exit(0)})"
```

### View Table Schema (replace TABLE_NAME)
```bash
npx ts-node -e "const{Sequelize}=require('sequelize');const db=new Sequelize({dialect:'sqlite',storage:'./data/seeme.db',logging:false});db.query('PRAGMA table_info(TABLE_NAME)').then(([r])=>{console.table(r);process.exit(0)})"
```

### Count Records in a Table (replace TABLE_NAME)
```bash
npx ts-node -e "const{Sequelize}=require('sequelize');const db=new Sequelize({dialect:'sqlite',storage:'./data/seeme.db',logging:false});db.query('SELECT COUNT(*) as count FROM TABLE_NAME').then(([r])=>{console.log(r);process.exit(0)})"
```

---

## Search & Filter Commands

### Find User by Username
```bash
npx ts-node -e "const{Sequelize}=require('sequelize');const db=new Sequelize({dialect:'sqlite',storage:'./data/seeme.db',logging:false});db.query(\"SELECT * FROM users WHERE username LIKE '%USERNAME%'\").then(([r])=>{console.table(r);process.exit(0)})"
```

### Find User by Email
```bash
npx ts-node -e "const{Sequelize}=require('sequelize');const db=new Sequelize({dialect:'sqlite',storage:'./data/seeme.db',logging:false});db.query(\"SELECT * FROM users WHERE email LIKE '%EMAIL%'\").then(([r])=>{console.table(r);process.exit(0)})"
```

### Get Posts by User ID
```bash
npx ts-node -e "const{Sequelize}=require('sequelize');const db=new Sequelize({dialect:'sqlite',storage:'./data/seeme.db',logging:false});db.query(\"SELECT * FROM posts WHERE user_id='USER_ID'\").then(([r])=>{console.table(r);process.exit(0)})"
```

### Get User's Followers
```bash
npx ts-node -e "const{Sequelize}=require('sequelize');const db=new Sequelize({dialect:'sqlite',storage:'./data/seeme.db',logging:false});db.query(\"SELECT u.username, u.email FROM follows f JOIN users u ON f.follower_id=u.id WHERE f.following_id='USER_ID'\").then(([r])=>{console.table(r);process.exit(0)})"
```

### Get Who User is Following
```bash
npx ts-node -e "const{Sequelize}=require('sequelize');const db=new Sequelize({dialect:'sqlite',storage:'./data/seeme.db',logging:false});db.query(\"SELECT u.username, u.email FROM follows f JOIN users u ON f.following_id=u.id WHERE f.follower_id='USER_ID'\").then(([r])=>{console.table(r);process.exit(0)})"
```

---

## Coin System Commands

### View All Coin Transactions
```bash
npx ts-node -e "const{Sequelize}=require('sequelize');const db=new Sequelize({dialect:'sqlite',storage:'./data/seeme.db',logging:false});db.query('SELECT * FROM coin_transactions ORDER BY created_at DESC LIMIT 50').then(([r])=>{console.table(r);process.exit(0)})"
```

### View Positivity Coins Balances
```bash
npx ts-node -e "const{Sequelize}=require('sequelize');const db=new Sequelize({dialect:'sqlite',storage:'./data/seeme.db',logging:false});db.query('SELECT * FROM positivity_coins').then(([r])=>{console.table(r);process.exit(0)})"
```

### View Coin Giving Activity
```bash
npx ts-node -e "const{Sequelize}=require('sequelize');const db=new Sequelize({dialect:'sqlite',storage:'./data/seeme.db',logging:false});db.query('SELECT * FROM coin_giving_activity ORDER BY created_at DESC').then(([r])=>{console.table(r);process.exit(0)})"
```

---

## Avatar & Profile Commands

### View Avatar Configs
```bash
npx ts-node -e "const{Sequelize}=require('sequelize');const db=new Sequelize({dialect:'sqlite',storage:'./data/seeme.db',logging:false});db.query('SELECT * FROM avatar_configs').then(([r])=>{console.table(r);process.exit(0)})"
```

### View Full Body Avatars
```bash
npx ts-node -e "const{Sequelize}=require('sequelize');const db=new Sequelize({dialect:'sqlite',storage:'./data/seeme.db',logging:false});db.query('SELECT * FROM full_body_avatars').then(([r])=>{console.table(r);process.exit(0)})"
```

---

## Topics & Community Commands

### View All Topics
```bash
npx ts-node -e "const{Sequelize}=require('sequelize');const db=new Sequelize({dialect:'sqlite',storage:'./data/seeme.db',logging:false});db.query('SELECT * FROM topics').then(([r])=>{console.table(r);process.exit(0)})"
```

### View Topic Follows
```bash
npx ts-node -e "const{Sequelize}=require('sequelize');const db=new Sequelize({dialect:'sqlite',storage:'./data/seeme.db',logging:false});db.query('SELECT * FROM topic_follows').then(([r])=>{console.table(r);process.exit(0)})"
```

### View User Medals
```bash
npx ts-node -e "const{Sequelize}=require('sequelize');const db=new Sequelize({dialect:'sqlite',storage:'./data/seeme.db',logging:false});db.query('SELECT * FROM user_global_medals').then(([r])=>{console.table(r);process.exit(0)})"
```

---

## Moderation Commands

### View Blocked Users
```bash
npx ts-node -e "const{Sequelize}=require('sequelize');const db=new Sequelize({dialect:'sqlite',storage:'./data/seeme.db',logging:false});db.query('SELECT * FROM blocked_users').then(([r])=>{console.table(r);process.exit(0)})"
```

### View Follow Requests (for private accounts)
```bash
npx ts-node -e "const{Sequelize}=require('sequelize');const db=new Sequelize({dialect:'sqlite',storage:'./data/seeme.db',logging:false});db.query('SELECT * FROM follow_requests').then(([r])=>{console.table(r);process.exit(0)})"
```

---

## Generic Query Template

Replace `YOUR_SQL_QUERY` with any SQL:
```bash
npx ts-node -e "const{Sequelize}=require('sequelize');const db=new Sequelize({dialect:'sqlite',storage:'./data/seeme.db',logging:false});db.query('YOUR_SQL_QUERY').then(([r])=>{console.table(r);process.exit(0)})"
```

---

## Full Database Dump

### Export All Data as JSON
```bash
npx ts-node -e "
const{Sequelize}=require('sequelize');
const fs=require('fs');
const db=new Sequelize({dialect:'sqlite',storage:'./data/seeme.db',logging:false});
(async()=>{
  const tables=['users','posts','comments','likes','follows','messages','conversations'];
  const dump={};
  for(const t of tables){
    try{const[r]=await db.query('SELECT * FROM '+t);dump[t]=r;}catch(e){dump[t]=[];}
  }
  fs.writeFileSync('./data/db-dump.json',JSON.stringify(dump,null,2));
  console.log('Saved to ./data/db-dump.json');
  process.exit(0);
})();
"
```

---

## Database Backup

### Create a Backup Copy
```bash
copy data\seeme.db data\seeme-backup-%date:~-4,4%%date:~-10,2%%date:~-7,2%.db
```

### On Linux/Mac
```bash
cp data/seeme.db data/seeme-backup-$(date +%Y%m%d).db
```

---

## Available Tables

| Table | Description |
|-------|-------------|
| `users` | User accounts |
| `posts` | User posts |
| `comments` | Post comments |
| `likes` | Post likes |
| `follows` | Follow relationships |
| `follow_requests` | Pending follow requests |
| `blocked_users` | Blocked user relationships |
| `messages` | Chat messages |
| `conversations` | Chat conversations |
| `coin_transactions` | Coin transaction history |
| `positivity_coins` | User coin balances |
| `coin_giving_activity` | Daily coin giving tracking |
| `avatar_configs` | User avatar configurations |
| `full_body_avatars` | 3D avatar data |
| `topics` | Community topics |
| `topic_follows` | Topic subscriptions |
| `post_topics` | Post-topic associations |
| `user_global_medals` | User achievement medals |
| `user_community_medals` | Community-specific medals |
| `user_favorites` | User favorites |
| `user_interactions` | User interaction tracking |
| `encouragement_streaks` | Streak tracking |
| `user_topic_status` | User status in topics |

---

## Tips

1. **Replace placeholders**: `TABLE_NAME`, `USER_ID`, `USERNAME`, `EMAIL` with actual values
2. **Add LIMIT**: For large tables, add `LIMIT 50` to avoid huge outputs
3. **JSON output**: Replace `console.table(r)` with `console.log(JSON.stringify(r,null,2))` for JSON format
4. **Backup regularly**: Create backups before major changes
