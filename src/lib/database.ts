import Database from "better-sqlite3";
import { randomUUID } from "node:crypto";
import { existsSync, mkdirSync, rmSync } from "node:fs";
import { dirname } from "node:path";

import {
  addDays,
  addHours,
  addWeeks,
  setHours,
  setMinutes,
  startOfDay,
  subDays,
} from "date-fns";

function resolveDatabasePath() {
  const configured = process.env.MEDIA_OPS_DB_PATH?.trim();
  if (configured) {
    return configured;
  }

  if (process.env.VERCEL) {
    return "/tmp/media-ops-workbench.db";
  }

  return "./data/workbench.db";
}

const DB_PATH = resolveDatabasePath();

let database: Database.Database | null = null;

function at(base: Date, hour: number, minute = 0) {
  return setMinutes(setHours(base, hour), minute).toISOString();
}

function ensureColumn(
  db: Database.Database,
  tableName: string,
  columnName: string,
  definition: string,
) {
  const columns = db.prepare(`PRAGMA table_info(${tableName})`).all() as Array<{
    name: string;
  }>;
  if (columns.some((column) => column.name === columnName)) {
    return;
  }
  db.exec(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${definition}`);
}

function initSchema(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      type TEXT NOT NULL,
      priority TEXT NOT NULL,
      due_at TEXT,
      owner TEXT,
      status TEXT NOT NULL,
      notes TEXT,
      cadence TEXT NOT NULL,
      is_today_focus INTEGER NOT NULL DEFAULT 0,
      source_text TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS workspace_days (
      date_key TEXT PRIMARY KEY,
      date TEXT NOT NULL UNIQUE,
      progress_status TEXT NOT NULL,
      morning_focus TEXT,
      review_text TEXT,
      tomorrow_plan TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS content_plans (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      content_type TEXT NOT NULL,
      audience TEXT NOT NULL,
      scenario TEXT NOT NULL,
      product TEXT NOT NULL,
      script TEXT NOT NULL,
      publish_at TEXT,
      status TEXT NOT NULL,
      calendar_label TEXT,
      data_note TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS inspiration_items (
      id TEXT PRIMARY KEY,
      link TEXT,
      screenshot TEXT,
      source_account TEXT NOT NULL,
      type TEXT NOT NULL,
      hook_summary TEXT NOT NULL,
      reusable_idea TEXT NOT NULL,
      tags TEXT NOT NULL,
      captured_at TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS competitor_observations (
      id TEXT PRIMARY KEY,
      account_name TEXT NOT NULL,
      platform TEXT NOT NULL,
      content_link TEXT,
      content_topic TEXT NOT NULL,
      hook_point TEXT NOT NULL,
      comment_insight TEXT NOT NULL,
      takeaway TEXT NOT NULL,
      observed_at TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS hot_topics (
      id TEXT PRIMARY KEY,
      keyword TEXT NOT NULL,
      type TEXT NOT NULL,
      source TEXT NOT NULL,
      happened_at TEXT NOT NULL,
      usable_direction TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS report_drafts (
      id TEXT PRIMARY KEY,
      raw_input TEXT NOT NULL,
      daily_report TEXT NOT NULL,
      weekly_draft TEXT NOT NULL,
      email_subject TEXT NOT NULL,
      email_body TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_tasks_due_at ON tasks(due_at);
    CREATE INDEX IF NOT EXISTS idx_content_publish_at ON content_plans(publish_at);
    CREATE INDEX IF NOT EXISTS idx_hot_topics_happened_at ON hot_topics(happened_at);
  `);

  ensureColumn(db, "content_plans", "calendar_label", "TEXT");
}

function seedDatabase(db: Database.Database) {
  const taskCount = db.prepare("SELECT COUNT(*) AS count FROM tasks").get() as {
    count: number;
  };
  if (taskCount.count > 0) return;

  const now = new Date();
  const today = startOfDay(now);
  const tomorrow = addDays(today, 1);
  const fridayLike = addDays(today, 3);
  const nextWeek = addWeeks(today, 1);
  const stamp = now.toISOString();

  const insertTask = db.prepare(`
    INSERT INTO tasks (
      id, title, type, priority, due_at, owner, status, notes, cadence,
      is_today_focus, source_text, created_at, updated_at
    ) VALUES (
      @id, @title, @type, @priority, @due_at, @owner, @status, @notes, @cadence,
      @is_today_focus, @source_text, @created_at, @updated_at
    )
  `);
  const insertWorkspace = db.prepare(`
    INSERT INTO workspace_days (
      date_key, date, progress_status, morning_focus, review_text,
      tomorrow_plan, created_at, updated_at
    ) VALUES (
      @date_key, @date, @progress_status, @morning_focus, @review_text,
      @tomorrow_plan, @created_at, @updated_at
    )
  `);
  const insertContent = db.prepare(`
    INSERT INTO content_plans (
      id, title, content_type, audience, scenario, product, script,
      publish_at, status, calendar_label, data_note, created_at, updated_at
    ) VALUES (
      @id, @title, @content_type, @audience, @scenario, @product, @script,
      @publish_at, @status, @calendar_label, @data_note, @created_at, @updated_at
    )
  `);
  const insertInspiration = db.prepare(`
    INSERT INTO inspiration_items (
      id, link, screenshot, source_account, type, hook_summary,
      reusable_idea, tags, captured_at, created_at
    ) VALUES (
      @id, @link, @screenshot, @source_account, @type, @hook_summary,
      @reusable_idea, @tags, @captured_at, @created_at
    )
  `);
  const insertCompetitor = db.prepare(`
    INSERT INTO competitor_observations (
      id, account_name, platform, content_link, content_topic,
      hook_point, comment_insight, takeaway, observed_at, created_at
    ) VALUES (
      @id, @account_name, @platform, @content_link, @content_topic,
      @hook_point, @comment_insight, @takeaway, @observed_at, @created_at
    )
  `);
  const insertTopic = db.prepare(`
    INSERT INTO hot_topics (
      id, keyword, type, source, happened_at, usable_direction, created_at
    ) VALUES (
      @id, @keyword, @type, @source, @happened_at, @usable_direction, @created_at
    )
  `);
  const insertReport = db.prepare(`
    INSERT INTO report_drafts (
      id, raw_input, daily_report, weekly_draft, email_subject, email_body, created_at
    ) VALUES (
      @id, @raw_input, @daily_report, @weekly_draft, @email_subject, @email_body, @created_at
    )
  `);

  const transaction = db.transaction(() => {
    insertWorkspace.run({
      date_key: today.toISOString().slice(0, 10),
      date: today.toISOString(),
      progress_status: "ON_TRACK",
      morning_focus: "先把直播预告脚本定下来，再把今天的对货和摄影跟进压实。",
      review_text:
        "上午完成了面试穿搭直播预告脚本，下午跟摄影确认了上身图补拍需求，数据复盘还差评论区关键词整理。",
      tomorrow_plan: "明早先对货，中午确认主播搭配，下午 3 点对直播口播。",
      created_at: stamp,
      updated_at: stamp,
    });

    const taskSamples = [
      {
        title: "确认今晚直播预告封面和标题",
        type: "CONTENT",
        priority: "CRITICAL",
        due_at: at(today, 11, 30),
        owner: "设计同事",
        status: "IN_PROGRESS",
        notes: "标题方向偏“面试第一眼赢麻了”，封面要突出通勤西装套装。",
        cadence: "ONE_OFF",
        is_today_focus: 1,
      },
      {
        title: "和主播对面试穿搭直播的 3 套 look",
        type: "LIVE",
        priority: "HIGH",
        due_at: at(tomorrow, 15, 0),
        owner: "主播小七",
        status: "NOT_STARTED",
        notes: "重点讲显瘦、提气色、面试不过分用力。",
        cadence: "ONE_OFF",
        is_today_focus: 1,
      },
      {
        title: "对货：春季西装套装、浅口单鞋库存",
        type: "STOCK",
        priority: "HIGH",
        due_at: at(tomorrow, 10, 0),
        owner: "仓库阿泽",
        status: "WAITING",
        notes: "确认 M/L 码和杏色补货节奏。",
        cadence: "ONE_OFF",
        is_today_focus: 1,
      },
      {
        title: "复盘昨晚通勤直播的停留和成交数据",
        type: "DATA",
        priority: "MEDIUM",
        due_at: at(today, 18, 0),
        owner: "自己",
        status: "NOT_STARTED",
        notes: "重点看前 5 分钟流失点和评论区高频问题。",
        cadence: "DAILY",
        is_today_focus: 0,
      },
      {
        title: "整理竞品本周爆款标题结构",
        type: "COMPETITOR",
        priority: "MEDIUM",
        due_at: at(fridayLike, 17, 0),
        owner: "自己",
        status: "IN_PROGRESS",
        notes: "拆成“人群 + 场景 + 结果”模板。",
        cadence: "WEEKLY",
        is_today_focus: 0,
      },
      {
        title: "汇总本周热点词到选题池",
        type: "HOTTOPIC",
        priority: "MEDIUM",
        due_at: at(fridayLike, 20, 0),
        owner: "自己",
        status: "NOT_STARTED",
        notes: "重点看春招、毕业季、通勤松弛感。",
        cadence: "WEEKLY",
        is_today_focus: 0,
      },
      {
        title: "学习 3 个爆款短视频开头钩子",
        type: "LEARNING",
        priority: "LOW",
        due_at: at(nextWeek, 16, 30),
        owner: "自己",
        status: "NOT_STARTED",
        notes: "沉淀到脚本模板库里。",
        cadence: "WEEKLY",
        is_today_focus: 0,
      },
    ];

    taskSamples.forEach((task) =>
      insertTask.run({
        id: randomUUID(),
        source_text: null,
        created_at: stamp,
        updated_at: stamp,
        ...task,
      }),
    );

    const contentSamples = [
      {
        title: "面试穿搭直播预告",
        content_type: "LIVE_TRAILER",
        audience: "春招/社招女生",
        scenario: "面试前一晚临时找穿搭参考",
        product: "奶油白西装套装 + 浅口鞋",
        script: "开头先抛问题：面试穿什么不出错？中段给 3 套搭配，再提醒直播间讲细节和预算。",
        publish_at: at(today, 19, 30),
        status: "SCRIPTING",
        calendar_label: "CAMPAIGN",
        data_note: "目标收藏率 > 6%，评论引导“想看哪套”。",
      },
      {
        title: "小个子通勤显高穿搭",
        content_type: "SHORT_VIDEO",
        audience: "150-160cm 通勤女生",
        scenario: "上班族日常穿搭",
        product: "高腰西裤 + 短西装",
        script: "前 3 秒先展示前后对比，强调腰线和鞋裤同色，再给版型建议。",
        publish_at: at(addDays(today, 1), 12, 15),
        status: "SHOOTING",
        calendar_label: "PRODUCTION",
        data_note: "补拍全身正侧面，观察完播和点赞比。",
      },
      {
        title: "毕业季第一套职场穿搭图文",
        content_type: "CAROUSEL",
        audience: "应届毕业生",
        scenario: "毕业答辩/入职第一周",
        product: "针织上衣 + 直筒半裙",
        script: "封面强调“干净不老气”，正文 6 张图拆面料、配色、鞋包建议。",
        publish_at: at(addDays(today, 2), 9, 0),
        status: "EDITING",
        calendar_label: "PRODUCTION",
        data_note: "看收藏和私信尺码咨询。",
      },
      {
        title: "直播间必备 5 件基础款种草",
        content_type: "SEEDING",
        audience: "25-32 岁轻熟通勤人群",
        scenario: "直播预热",
        product: "衬衫/西装裤/乐福鞋",
        script: "按“省心搭配公式”讲 5 件基础款，每件都要落到场景和身材问题。",
        publish_at: at(addDays(today, 3), 20, 0),
        status: "IDEA",
        calendar_label: "IDEA_POOL",
        data_note: "待确认货盘和库存。",
      },
      {
        title: "梨形身材怎么选半裙",
        content_type: "OUTFIT",
        audience: "梨形身材女生",
        scenario: "上班/约会两用",
        product: "A 字半裙 + 修身针织",
        script: "先讲雷区，再给 3 个版型筛选标准，结尾引导评论身材困扰。",
        publish_at: at(addDays(today, 5), 18, 30),
        status: "SCHEDULED",
        calendar_label: "PUBLISH",
        data_note: "作为周末蓄水内容，关注评论区互动深度。",
      },
    ];

    contentSamples.forEach((item) =>
      insertContent.run({
        id: randomUUID(),
        created_at: stamp,
        updated_at: stamp,
        ...item,
      }),
    );

    const inspirationSamples = [
      {
        link: "https://www.xiaohongshu.com/explore/interview-look",
        screenshot: "封面截图占位",
        source_account: "穿搭研究所",
        type: "COVER",
        hook_summary: "纯色背景 + 一眼看懂的场景文案，封面信息特别直接。",
        reusable_idea: "直播预告封面可以用“面试穿搭 3 套抄作业”这种数字化表达。",
        tags: "面试穿搭,直播预告,封面",
        captured_at: subDays(today, 1).toISOString(),
      },
      {
        link: "https://www.xiaohongshu.com/explore/title-sample",
        screenshot: "标题截图占位",
        source_account: "通勤穿搭日记",
        type: "TITLE",
        hook_summary: "标题统一采用“人群 + 场景 + 结果”的公式。",
        reusable_idea: "适合做毕业季和社招主题的标题模板。",
        tags: "标题,人群词,场景词",
        captured_at: subDays(today, 2).toISOString(),
      },
      {
        link: "https://www.xiaohongshu.com/explore/copy-sample",
        screenshot: "文案截图占位",
        source_account: "阿桃穿搭",
        type: "COPY",
        hook_summary: "文案用口语化提问切入，像在替用户说话。",
        reusable_idea: "直播预告文案第一句优先用用户痛点提问。",
        tags: "文案,口语化,痛点",
        captured_at: subDays(today, 3).toISOString(),
      },
      {
        link: "https://www.xiaohongshu.com/explore/video-structure",
        screenshot: "视频结构截图占位",
        source_account: "职场感穿搭",
        type: "VIDEO_STRUCTURE",
        hook_summary: "3 秒钩子 + 3 套穿搭连播 + 结尾评论引导，节奏很快。",
        reusable_idea: "短视频结构可以沿用到主播预告内容。",
        tags: "视频结构,钩子,节奏",
        captured_at: subDays(today, 4).toISOString(),
      },
      {
        link: "https://www.xiaohongshu.com/explore/comment-insight",
        screenshot: "评论截图占位",
        source_account: "面试穿搭笔记",
        type: "COMMENTS",
        hook_summary: "高赞评论集中在“预算”“显瘦”“不显学生气”。",
        reusable_idea: "把这些词直接加入直播口播和评论区预埋话术。",
        tags: "评论区,高赞,用户语言",
        captured_at: addHours(today, -18).toISOString(),
      },
      {
        link: "https://www.xiaohongshu.com/explore/audio-sample",
        screenshot: "音效截图占位",
        source_account: "城市通勤感",
        type: "AUDIO",
        hook_summary: "轻快节奏的通勤氛围音乐，适合城市感穿搭。",
        reusable_idea: "适合预告片头和上身展示。",
        tags: "音效,通勤氛围,城市感",
        captured_at: addHours(today, -6).toISOString(),
      },
    ];

    inspirationSamples.forEach((item) =>
      insertInspiration.run({
        id: randomUUID(),
        created_at: stamp,
        ...item,
      }),
    );

    const competitorSamples = [
      {
        account_name: "白桃职场穿搭",
        platform: "XIAOHONGSHU",
        content_link: "https://www.xiaohongshu.com/explore/comp-1",
        content_topic: "面试穿搭避雷",
        hook_point: "开头直接说“这 3 套千万别穿去面试”。",
        comment_insight: "用户对“不要太学生气”和“显精神”讨论最多。",
        takeaway: "做反差式开头更容易让用户停留，后面再顺接解决方案。",
        observed_at: subDays(today, 1).toISOString(),
      },
      {
        account_name: "上班这样穿",
        platform: "DOUYIN",
        content_link: "https://www.douyin.com/video/comp-2",
        content_topic: "小个子通勤显高",
        hook_point: "先上身对比，再给结论，前 2 秒信息非常密。",
        comment_insight: "用户会追问具体裤长和鞋跟高度。",
        takeaway: "脚本里要把尺寸信息讲得更具体，不然评论区容易反复问。",
        observed_at: subDays(today, 2).toISOString(),
      },
      {
        account_name: "晚晚直播间",
        platform: "TAOBAO_LIVE",
        content_link: "https://www.taobao.com/live/comp-3",
        content_topic: "直播预热口播节奏",
        hook_point: "反复强调“今晚 8 点，现场教你挑版型”。",
        comment_insight: "用户更吃具体利益点，不吃空泛“别错过”。",
        takeaway: "预告里要明确说直播能解决什么问题，而不是只写时间。",
        observed_at: addHours(today, -10).toISOString(),
      },
      {
        account_name: "松弛感通勤",
        platform: "WECHAT_VIDEO",
        content_link: "https://video.weixin.qq.com/comp-4",
        content_topic: "春季针织上衣推荐",
        hook_point: "镜头语言干净，人物表情放松，很有信任感。",
        comment_insight: "用户会被“日常能复制”的穿搭场景吸引。",
        takeaway: "拍摄时要多给出走路、坐下、拿包这类真实通勤动作。",
        observed_at: addHours(today, -5).toISOString(),
      },
    ];

    competitorSamples.forEach((item) =>
      insertCompetitor.run({
        id: randomUUID(),
        created_at: stamp,
        ...item,
      }),
    );

    const topicSamples = [
      {
        keyword: "面试穿搭",
        type: "SCENE",
        source: "小红书搜索联想",
        happened_at: today.toISOString(),
        usable_direction: "可做直播预告、图文清单、避雷短视频。",
      },
      {
        keyword: "通勤松弛感",
        type: "EMOTION",
        source: "评论区高频词",
        happened_at: today.toISOString(),
        usable_direction: "适合做日常通勤风格化表达，提升内容情绪价值。",
      },
      {
        keyword: "小个子显高",
        type: "AUDIENCE",
        source: "竞品标题",
        happened_at: subDays(today, 1).toISOString(),
        usable_direction: "适合做短视频和轮播图封面关键词。",
      },
      {
        keyword: "毕业季第一套职场穿搭",
        type: "TREND",
        source: "春招节点",
        happened_at: subDays(today, 2).toISOString(),
        usable_direction: "适合周专题，带入新人成长感。",
      },
      {
        keyword: "梨形身材遮胯",
        type: "AUDIENCE",
        source: "私信咨询",
        happened_at: subDays(today, 3).toISOString(),
        usable_direction: "适合做半裙、阔腿裤、版型讲解内容。",
      },
      {
        keyword: "轻通勤",
        type: "TREND",
        source: "平台热榜",
        happened_at: addHours(today, -3).toISOString(),
        usable_direction: "适合直播间整场货盘的风格总主题。",
      },
    ];

    topicSamples.forEach((item) =>
      insertTopic.run({
        id: randomUUID(),
        created_at: stamp,
        ...item,
      }),
    );

    insertReport.run({
      id: randomUUID(),
      raw_input:
        "今天拍了 4 小时，跟进了摄影，出了 1 条文案，晚上复盘了直播数据，明天要对货和跟主播对搭配。",
      daily_report:
        "今日完成了直播相关拍摄 4 小时，已跟进摄影排期与补拍事项，产出 1 条预告文案，并完成晚间直播数据初步复盘。",
      weekly_draft:
        "本周围绕春季通勤与面试穿搭主题，推进了直播预告、拍摄协同、文案产出与数据复盘，内容链路基本完整，后续重点放在对货确认与主播搭配磨合。",
      email_subject: "【日报】春季通勤直播内容推进情况",
      email_body:
        "今日完成了直播拍摄与摄影跟进，已输出 1 条预告文案，并对晚间直播数据做初步复盘。明日计划先完成对货，再与主播确认搭配细节。",
      created_at: stamp,
    });
  });

  transaction();
}

export function getDb() {
  if (!database) {
    mkdirSync(dirname(DB_PATH), { recursive: true });
    database = new Database(DB_PATH);
    database.pragma("journal_mode = WAL");
    initSchema(database);
    seedDatabase(database);
  }
  return database;
}

export function ensureDatabase() {
  getDb();
  return DB_PATH;
}

export function resetDatabase() {
  if (database) {
    database.close();
    database = null;
  }
  if (existsSync(DB_PATH)) {
    rmSync(DB_PATH, { force: true });
  }
  return ensureDatabase();
}
