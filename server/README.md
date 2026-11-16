# 投壶拒腐 · 后端服务

为「投壶拒腐」前端提供：账号登录、游戏过程数据上报、服务端清算、排行榜。

机制口径（书记审定 2026-11）：每轮情景题 ABC 三选项只有唯一正确项，选错该题 0 分；
选对后投壶定分——三壶难度档位 易=10 / 中=15 / 难=20 分，投中得壶分，未中保底 5 分；
第 2/4/6/8 轮穿插法规判断题，答对得清风令，终局每枚 +10 分。

## 一、技术栈（为什么选这些）

| 技术 | 作用 | 类比前端 |
|---|---|---|
| Spring Boot 3 | Web 框架，接收/响应 HTTP 请求 | 类似 Vite + Vue 的合体，开箱即用 |
| MyBatis-Plus | 数据库访问，单表增删改查免写 SQL | 类似前端的 ORM / 请求封装 |
| MySQL 8 | 数据库 | 持久化的 localStorage |
| JWT | 登录令牌 | 类似前端存 token，但由服务端签发验签 |
| Maven | 依赖管理与打包 | 相当于 npm |

100 人同时在线对本服务毫无压力：每次请求都是一次短小的数据库读写，
Spring Boot 内嵌 Tomcat 默认 200 线程，MySQL 默认 151 连接，绰绰有余。

## 二、目录结构（按业务分模块，而不是按技术分层堆一起）

```
server/
├── pom.xml                          # Maven 配置（≈ package.json）
└── src/main/
    ├── resources/
    │   ├── application.yml          # 配置文件（端口/数据库/密钥）
    │   └── db/schema.sql            # 建表脚本（启动时自动执行）
    │   └── db/seed_questions.sql    # 题目种子数据（启动时自动执行，ON DUPLICATE KEY UPDATE 幂等）
    └── java/com/xingwang/touhu/
        ├── TouhuApplication.java    # 程序入口
        ├── common/                  # 通用层：统一返回体、异常处理、枚举
        ├── config/                  # 配置层：登录拦截器、跨域、初始化
        ├── auth/                    # 认证模块：注册/登录/JWT
        ├── user/                    # 用户表实体与 Mapper
        ├── question/                # 题目模块：场景题/判断题抽题
        ├── game/                    # 游戏模块：对局、作答、答题、清算
        └── leaderboard/             # 排行榜模块
```

每个业务模块内部再分：`entity`（对应数据库表）、`mapper`（数据库操作接口）、
`dto`（接口的请求/返回对象）、`Service`（业务逻辑）、`Controller`（HTTP 接口入口）。
请求流转顺序：**Controller → Service → Mapper → MySQL**，与前端的「页面 → store → api → 服务器」一一对应。

### 新增业务模块约定

- 知识竞赛写在 `com.xingwang.touhu.quiz`，情景剧本写在 `com.xingwang.touhu.scenario`；
  各模块内部按需要设置 `Controller`、`Service`、`entity/`、`mapper/`、`dto/`。
- 新接口分别以 `/api/quiz/**`、`/api/scenario/**` 为前缀。
- 新表分别使用 `knowledge_*`、`scenario_*` 前缀，例如 `knowledge_quiz_questions`、`scenario_scripts`。
- 现有 `question` 包、`QuizQuestion/QuizRecord`、`quiz_questions/quiz_records` 及 `/api/game/**/quiz`
  都是投壶内部实现，不作为公共题库复用，也不要为了新模块修改其名称。
- 模块之间不直接调用对方的 Mapper；公共层只复用认证、用户、统一返回和异常处理。
  当前 `@MapperScan` 已覆盖上述新包，无需增加配置。

## 三、本地跑起来

前置环境：JDK 17+、Maven 3.8+（IDEA 自带）、MySQL 8。

```bash
# 1. 创建数据库（在 MySQL 客户端里执行一次）
CREATE DATABASE touhu DEFAULT CHARSET utf8mb4;

# 2. 在 server 目录下启动（首次会自动下载依赖，需几分钟）
cd server
mvn spring-boot:run

# 或者用 IDEA 直接运行 TouhuApplication.main()
```

启动时会自动：建表（`schema.sql`）→ 灌入题目种子 → 创建管理员账号 `admin / admin123`（**上线后请立即修改**）。

验证：浏览器访问 `http://localhost:8080/api/leaderboard` 返回 `{"code":0,...}` 即成功。

## 四、数据库设计（重点）

```
users            用户表        —— 登录账号、姓名、角色（PLAYER/ADMIN）
game_sessions    对局表        —— 每局一行：最终得分、清风令数、question_plan（本局抽题结果 JSON）
throw_records    轮次记录表    —— 每轮一行：选项作答（option_key/option_correct）
                                 + 答对时的投壶（pot_type/pointer_pos/in_zone/hit，答错为 NULL）
quiz_records     答题记录表    —— 第 2/4/6/8 轮判断题作答
scene_questions  场景题表      —— 情景 + 选项（options_json 含 correct 正确项标记）
quiz_questions   判断题表      —— 合规判断 + 解析 + 依据条文
```

### 题目下发与进度续玩

- 开局时服务端从题目表随机抽 9 道不重复场景题（选项顺序打乱）+ 4 道不重复判断题，
  完整题目 JSON 存入 `game_sessions.question_plan` 并随开局接口一次下发；
- 前端不保存进度（无 localStorage），换设备/刷新后通过
  `GET /api/game/sessions/current` 拉取 question_plan + 全部明细记录，重放重建状态续玩，
  题目与选项顺序与开局完全一致；
- 题目源文件在前端 `src/data/touhu/scenes.js`、`src/data/touhu/quiz.js`，改题后在仓库根目录执行
  `node scripts/gen-seed-questions.mjs` 重新生成 `seed_questions.sql`。

### 作答与投壶一体上报

- 每轮只写一条 `throw_records`：答错时只带 `optionKey`（投壶字段为 NULL、得分 0）；
  答对时带 `optionKey + potType/pointerPos/inZone`；
- 选项对错由服务端按本局 question_plan 判定，客户端伪造投壶字段无法得分；
- `(session_id, round_no)` 唯一键保证网络重试/重复点击不产生脏数据。

## 五、API 一览

统一返回格式：`{ "code": 0, "message": "ok", "data": ... }`，`code === 0` 为成功。
除注册/登录/排行榜外，所有接口需在 Header 携带 `Authorization: Bearer <token>`。

### 认证
| 方法 | 路径 | 说明 |
|---|---|---|
| POST | /api/auth/register | 注册（账号/密码/姓名/部门） |
| POST | /api/auth/login | 登录，返回 token |
| GET | /api/auth/me | 当前用户信息 |

### 游戏（前端每轮操作后上报，服务端按轮次校验顺序）
| 方法 | 路径 | 说明 |
|---|---|---|
| POST | /api/game/sessions | 开局（抽题并下发 questionPlan：9 场景 + 4 判断，以及 rules 规则快照） |
| GET | /api/game/sessions/current | 查询进行中的对局完整状态（questionPlan + throws/quizzes，用于续玩重建） |
| POST | /api/game/sessions/{id}/throws | 上报一轮作答（答错）或作答+投壶（答对） |
| POST | /api/game/sessions/{id}/quiz | 上报一轮答题 |
| POST | /api/game/sessions/{id}/finish | 终局清算（服务端重算分数） |
| POST | /api/game/sessions/{id}/abandon | 放弃对局（退出游戏/重开时调用） |
| GET | /api/game/my/history | 我的历史战绩 |

### 排行榜
| 方法 | 路径 | 说明 |
|---|---|---|
| GET | /api/leaderboard?limit=50 | 本周排行榜（自然周，周一 00:00 重置；每人取本周最高分，含 gamesThisWeek 字段） |

## 六、防作弊设计

- **分数服务端重算**：客户端只上报「选了哪个选项、投了哪个壶、指针是否进区间」，
  选项对错、命中与否、得分、最终清算全部由服务端按规则推导（`SettlementService`），
  与前端 `data/touhu/config.js` 的数值严格对齐（开局时服务端会下发 rules 快照，
  前端展示数值以快照为准，双端漂移能直接被发现）；
- **轮次顺序校验**：服务端跟踪 `current_round`，跳轮/重复上报会被拒绝；
  答题必须在本轮作答之后、题目必须与本局抽题结果一致；
- **唯一键幂等**：同一局同一轮的作答/答题记录有数据库唯一约束，
  网络重试不会产生脏数据；
- **并发开局防护**：同一用户的开局走 MySQL 命名锁，双击/重试不会产生两局进行中；
- **登录限流**：同一账号密码连续错误 5 次锁定 10 分钟；
- **对局归属校验**：只能操作自己的对局。

## 七、领学课程（线下执行）

结算页会在最终分数低于 40 分时提示玩家「需完成 1 次廉洁文化课程」。
**课程学习本身由活动方线下组织，系统不记录、不打卡**。

## 八、部署建议（100 人规模）

```bash
mvn package                    # 打出一个可独立运行的 jar：target/touhu-server-1.0.0.jar
java -jar touhu-server-1.0.0.jar   # 启动（生产环境用环境变量覆盖配置）
```

生产环境必改的环境变量：

```bash
export DB_HOST=数据库地址 DB_USER=... DB_PASSWORD=...
export JWT_SECRET=足够长的随机字符串
```

- 前端静态文件可用 Nginx 托管，并把 `/api` 反代到本服务（8080 端口），避免跨域；
- 想后台常驻运行：`nohup java -jar ... &`，或注册为 systemd 服务；
- 记得改 admin 初始密码，并关闭公网注册（如需：在 AuthController 删掉 register 接口，由管理员后台开户）。
