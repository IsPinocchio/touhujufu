-- ============================================================================
-- 投壶拒腐 · 数据库建表脚本
-- 数据库：MySQL 8.x，字符集 utf8mb4（支持中文与 emoji）
-- 执行方式：服务启动时自动执行（application.yml 中 spring.sql.init 配置），
--           所有语句均为 IF NOT EXISTS，重复执行无副作用。
--
-- 设计要点（对应需求）：
--  1. throw_records 逐轮如实记录【投了哪个壶、是否命中、抽到什么卡】。
--     即使投腐败/擦边壶抽到「平安无事」卡、得分保留、排名照上，
--     这条投掷记录依然存在 —— 这就是日后「大清洗」抓人的依据。
--  2. game_sessions.used_risky_pot 是对局级冗余标记，清洗时不用翻明细，效率高。
--  3. purge_batches / purge_records 记录每次清洗的批次与明细，可追溯、可审计。
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 用户表：登录账号
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id            BIGINT       PRIMARY KEY AUTO_INCREMENT COMMENT '用户ID',
  username      VARCHAR(32)  NOT NULL UNIQUE COMMENT '登录账号（唯一）',
  password_hash VARCHAR(72)  NOT NULL COMMENT 'BCrypt 密码哈希，绝不明文存储',
  display_name  VARCHAR(32)  NOT NULL COMMENT '显示姓名（排行榜展示用）',
  department    VARCHAR(64)  DEFAULT NULL COMMENT '部门（可选）',
  role          VARCHAR(16)  NOT NULL DEFAULT 'PLAYER' COMMENT '角色：PLAYER 玩家 / ADMIN 管理员',
  status        TINYINT      NOT NULL DEFAULT 1 COMMENT '状态：1 正常 / 0 停用',
  created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '注册时间',
  last_login_at DATETIME     DEFAULT NULL COMMENT '最近登录时间'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户表';

-- ---------------------------------------------------------------------------
-- 对局表：每玩一局产生一行
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS game_sessions (
  id              BIGINT      PRIMARY KEY AUTO_INCREMENT COMMENT '对局ID',
  user_id         BIGINT      NOT NULL COMMENT '玩家用户ID',
  status          VARCHAR(16) NOT NULL DEFAULT 'PLAYING' COMMENT '状态：PLAYING 进行中 / FINISHED 已完结 / ABANDONED 中途放弃',
  current_round   INT         NOT NULL DEFAULT 1 COMMENT '当前进行到的轮次（1~9，10 表示已完成全部投掷）',

  -- —— 结算结果（由服务端根据明细重算，不信客户端上报值，防作弊） ——
  final_score     INT         NOT NULL DEFAULT 0 COMMENT '清算后最终得分（被清洗后会置 0）',
  clue_count      INT         NOT NULL DEFAULT 0 COMMENT '最终线索数（交代前抽到的线索卡已被消除，不计）',
  penalty         VARCHAR(16) NOT NULL DEFAULT 'NONE' COMMENT '处分：NONE 平安着陆 / LIGHT 轻处分(减半) / HEAVY 重处分(清零)',
  breeze_tokens   INT         NOT NULL DEFAULT 0 COMMENT '清风令数量（答题获得）',
  confessed       TINYINT     NOT NULL DEFAULT 0 COMMENT '是否主动交代过：1 是 / 0 否',

  -- —— 大清洗关键字段 ——
  used_risky_pot  TINYINT     NOT NULL DEFAULT 0 COMMENT '是否投过腐败/擦边壶（无论抽到什么卡）：1 是 / 0 否',
  purged          TINYINT     NOT NULL DEFAULT 0 COMMENT '是否已被大清洗清零：1 是 / 0 否',
  purge_batch_id  BIGINT      DEFAULT NULL COMMENT '被哪一批清洗清零（关联 purge_batches.id）',

  -- —— 本局抽题结果（JSON：9 道场景题 + 4 道判断题，含已打乱的选项顺序） ——
  -- MEDIUMTEXT：9 道场景全文 + 选项 + 解析为中文 UTF-8（3 字节/字），TEXT 的 64KB 上限有撑爆风险
  question_plan   MEDIUMTEXT  DEFAULT NULL COMMENT '本局抽题结果 JSON，开局时生成，续玩时原样返回',

  started_at      DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '开局时间',
  finished_at     DATETIME    DEFAULT NULL COMMENT '完结时间',

  INDEX idx_user (user_id),
  -- 排行榜查询：未清洗 + 已完结，按分数倒序
  INDEX idx_leaderboard (status, purged, final_score DESC),
  -- 清洗筛查：投过风险壶、有分、未清洗
  INDEX idx_purge (status, purged, used_risky_pot, final_score)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='对局表';

-- ---------------------------------------------------------------------------
-- 投掷记录表：每轮投壶一行，审计与清洗的事实依据
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS throw_records (
  id           BIGINT      PRIMARY KEY AUTO_INCREMENT COMMENT '记录ID',
  session_id   BIGINT      NOT NULL COMMENT '所属对局ID',
  round_no     INT         NOT NULL COMMENT '轮次 1~9',
  scene_id     VARCHAR(32) DEFAULT NULL COMMENT '本轮场景题ID（前端题库里的 id）',
  pot_type     VARCHAR(16) NOT NULL COMMENT '所投的壶：CORRUPT 腐败壶 / EDGE 擦边壶 / CLEAN 廉洁壶',
  pointer_pos  DECIMAL(4,3) NOT NULL COMMENT '松手时指针位置 0~1',
  in_zone      TINYINT     NOT NULL COMMENT '指针是否落在高亮区间：1 是 / 0 否',
  hit          TINYINT     NOT NULL COMMENT '是否命中：1 是 / 0 否',
  score_gained INT         NOT NULL DEFAULT 0 COMMENT '本次得分（命中得分，未中 0）',
  card_type    VARCHAR(16) NOT NULL DEFAULT 'NONE' COMMENT '抽到的卡：NONE 未抽卡 / SAFE 平安无事 / CLUE 留下线索',
  created_at   DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '投掷时间',

  -- 同一局同一轮只允许一条投掷记录：客户端重试/网络重发不会产生脏数据
  UNIQUE KEY uk_session_round (session_id, round_no),
  INDEX idx_session (session_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='投掷记录表';

-- ---------------------------------------------------------------------------
-- 答题记录表：第 2/4/6/8 轮的法规判断题
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS quiz_records (
  id         BIGINT      PRIMARY KEY AUTO_INCREMENT COMMENT '记录ID',
  session_id BIGINT      NOT NULL COMMENT '所属对局ID',
  round_no   INT         NOT NULL COMMENT '轮次（2/4/6/8）',
  quiz_id    VARCHAR(32) DEFAULT NULL COMMENT '题目ID（前端题库里的 id）',
  correct    TINYINT     NOT NULL COMMENT '是否答对：1 是 / 0 否（答对得 1 枚清风令）',
  created_at DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '答题时间',

  UNIQUE KEY uk_session_round (session_id, round_no),
  INDEX idx_session (session_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='答题记录表';

-- ---------------------------------------------------------------------------
-- 付费查看记录表：玩家花积分偷看线索卡的行为（也是廉洁教育的数据素材）
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS card_view_records (
  id         BIGINT      PRIMARY KEY AUTO_INCREMENT COMMENT '记录ID',
  session_id BIGINT      NOT NULL COMMENT '所属对局ID',
  round_no   INT         NOT NULL COMMENT '查看的是哪一轮抽到的卡',
  cost       INT         NOT NULL COMMENT '扣除的分数（腐败壶卡 10 分 / 擦边壶卡 5 分）',
  created_at DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '查看时间',

  UNIQUE KEY uk_session_round (session_id, round_no),
  INDEX idx_session (session_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='付费查看记录表';

-- ---------------------------------------------------------------------------
-- 清洗批次表：每次大清洗一行（定时任务或管理员手动触发）
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS purge_batches (
  id             BIGINT      PRIMARY KEY AUTO_INCREMENT COMMENT '批次ID',
  execute_type   VARCHAR(16) NOT NULL COMMENT '触发方式：SCHEDULED 定时 / MANUAL 手动',
  operator_id    BIGINT      DEFAULT NULL COMMENT '手动触发时的管理员ID（定时为 NULL）',
  affected_count INT         NOT NULL DEFAULT 0 COMMENT '本批清洗了多少局',
  created_at     DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '执行时间'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='清洗批次表';

-- ---------------------------------------------------------------------------
-- 清洗明细表：记录每一局被清零前的原始得分，可追溯、可公示
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS purge_records (
  id             BIGINT   PRIMARY KEY AUTO_INCREMENT COMMENT '记录ID',
  batch_id       BIGINT   NOT NULL COMMENT '所属清洗批次ID',
  session_id     BIGINT   NOT NULL COMMENT '被清洗的对局ID',
  user_id        BIGINT   NOT NULL COMMENT '被清洗的玩家ID',
  original_score INT      NOT NULL COMMENT '清洗前得分（清零后可通过此表查到历史分数）',
  created_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '清洗时间',

  INDEX idx_batch (batch_id),
  INDEX idx_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='清洗明细表';

-- ---------------------------------------------------------------------------
-- 场景题表：投壶情景题（每轮一道，选项映射三个壶）
-- options_json 为 JSON 数组：[{"key":"a","text":"...","pot":"corrupt|edge|clean"}, ...]
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS scene_questions (
  id          VARCHAR(8)  PRIMARY KEY COMMENT '题目编号（SC + 三位序号）',
  category    VARCHAR(32) NOT NULL COMMENT '廉洁风险类别',
  difficulty  TINYINT     NOT NULL DEFAULT 1 COMMENT '难度：1 直观 / 2 警醒 / 3 边界',
  scene_text  TEXT        NOT NULL COMMENT '情景描述',
  options_json TEXT       NOT NULL COMMENT '选项 JSON（含壶映射）',
  hint        TEXT        DEFAULT NULL COMMENT '教育点解析（投掷后展示）',
  source      VARCHAR(32) DEFAULT NULL COMMENT '题目来源',
  enabled     TINYINT     NOT NULL DEFAULT 1 COMMENT '是否启用：1 是 / 0 否'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='场景题库';

-- ---------------------------------------------------------------------------
-- 判断题表：法规判断题（第 2/4/6/8 轮，答对得清风令）
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS quiz_questions (
  id          VARCHAR(8)  PRIMARY KEY COMMENT '题目编号（QZ + 三位序号）',
  category    VARCHAR(32) NOT NULL COMMENT '法规类别',
  difficulty  TINYINT     NOT NULL DEFAULT 1 COMMENT '难度：1 一眼违规 / 2 反直觉 / 3 边界',
  scene       TEXT        NOT NULL COMMENT '情景描述',
  compliant   TINYINT     NOT NULL COMMENT '是否合规：1 可以做 / 0 违规',
  answer_note VARCHAR(64) DEFAULT NULL COMMENT '一句话答案',
  explain_text TEXT       DEFAULT NULL COMMENT '讲解（列名不用 explain，它是 MySQL 保留字）',
  basis       VARCHAR(128) DEFAULT NULL COMMENT '纪律依据',
  enabled     TINYINT     NOT NULL DEFAULT 1 COMMENT '是否启用：1 是 / 0 否'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='判断题库';

-- 兼容存量库：老库的 question_plan 列可能是 TEXT 或不存在。
-- MODIFY COLUMN 幂等：列存在则调整为 MEDIUMTEXT，重复执行不报错。
-- 极老库若无此列，手动执行一次：ALTER TABLE game_sessions ADD COLUMN question_plan MEDIUMTEXT NULL;
ALTER TABLE game_sessions MODIFY COLUMN question_plan MEDIUMTEXT NULL COMMENT '本局抽题结果 JSON，开局时生成，续玩时原样返回';

-- 注：内置管理员账号由服务端启动时创建（DataInitializer），
--     因为 BCrypt 哈希必须由程序实时生成，写死在 SQL 里容易出错。
