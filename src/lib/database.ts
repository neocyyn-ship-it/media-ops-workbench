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
  subDays,
} from "date-fns";

import { getAppDateKey, getAppDayInterval, getAppToday } from "@/lib/app-time";

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
      workflow_stage TEXT NOT NULL DEFAULT 'TOPIC',
      calendar_label TEXT,
      data_note TEXT,
      selection_notes TEXT,
      business_notes TEXT,
      inventory_notes TEXT,
      shoot_date TEXT,
      styling_notes TEXT,
      camera_notes TEXT,
      voiceover_notes TEXT,
      asset_notes TEXT,
      edit_brief TEXT,
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

    CREATE TABLE IF NOT EXISTS weekly_engagements (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      type TEXT NOT NULL,
      date TEXT NOT NULL,
      time TEXT,
      contact_name TEXT NOT NULL,
      contact_role TEXT NOT NULL,
      note TEXT,
      reference_links TEXT,
      status TEXT NOT NULL,
      remark TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_tasks_due_at ON tasks(due_at);
    CREATE INDEX IF NOT EXISTS idx_content_publish_at ON content_plans(publish_at);
    CREATE INDEX IF NOT EXISTS idx_hot_topics_happened_at ON hot_topics(happened_at);
    CREATE INDEX IF NOT EXISTS idx_weekly_engagements_date ON weekly_engagements(date);
  `);

  ensureColumn(db, "content_plans", "calendar_label", "TEXT");
  ensureColumn(db, "content_plans", "workflow_stage", "TEXT NOT NULL DEFAULT 'TOPIC'");
  ensureColumn(db, "content_plans", "selection_notes", "TEXT");
  ensureColumn(db, "content_plans", "business_notes", "TEXT");
  ensureColumn(db, "content_plans", "inventory_notes", "TEXT");
  ensureColumn(db, "content_plans", "shoot_date", "TEXT");
  ensureColumn(db, "content_plans", "styling_notes", "TEXT");
  ensureColumn(db, "content_plans", "camera_notes", "TEXT");
  ensureColumn(db, "content_plans", "voiceover_notes", "TEXT");
  ensureColumn(db, "content_plans", "asset_notes", "TEXT");
  ensureColumn(db, "content_plans", "edit_brief", "TEXT");
  ensureColumn(db, "weekly_engagements", "time", "TEXT");
  ensureColumn(db, "weekly_engagements", "note", "TEXT");
  ensureColumn(db, "weekly_engagements", "reference_links", "TEXT");
  ensureColumn(db, "weekly_engagements", "remark", "TEXT");
}

function seedDatabase(db: Database.Database) {
  const taskCount = db.prepare("SELECT COUNT(*) AS count FROM tasks").get() as {
    count: number;
  };
  if (taskCount.count > 0) return;

  const now = new Date();
  const today = getAppToday();
  const tomorrow = addDays(today, 1);
  const fridayLike = addDays(today, 3);
  const nextWeek = addWeeks(today, 1);
  const stamp = now.toISOString();
  const todayInterval = getAppDayInterval(today);

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
  const insertWeeklyEngagement = db.prepare(`
    INSERT INTO weekly_engagements (
      id, title, type, date, time, contact_name, contact_role, note,
      reference_links, status, remark, created_at, updated_at
    ) VALUES (
      @id, @title, @type, @date, @time, @contact_name, @contact_role, @note,
      @reference_links, @status, @remark, @created_at, @updated_at
    )
  `);

  const transaction = db.transaction(() => {
    insertWorkspace.run({
      date_key: getAppDateKey(today),
      date: todayInterval.start.toISOString(),
      progress_status: "ON_TRACK",
      morning_focus: "先把直播预告脚本定下来，再把今天的对货和拍摄跟进落地。",
      review_text:
        "上午完成了预告脚本，下午确认了补拍需求，数据复盘还差评论区关键词整理。",
      tomorrow_plan: "明早先对货，中午确认主播搭配，下午3点对直播口播。",
      created_at: stamp,
      updated_at: stamp,
    });

    const taskSamples = [
      {
        title: "纭浠婃櫄鐩存挱棰勫憡灏侀潰鍜屾爣棰?",
        type: "CONTENT",
        priority: "CRITICAL",
        due_at: at(today, 11, 30),
        owner: "璁捐鍚屼簨",
        status: "IN_PROGRESS",
        notes: "鏍囬鏂瑰悜鍋忊€滈潰璇曠涓€鐪艰耽楹讳簡鈥濓紝灏侀潰瑕佺獊鍑洪€氬嫟瑗胯濂楄銆?",
        cadence: "ONE_OFF",
        is_today_focus: 1,
      },
      {
        title: "鍜屼富鎾闈㈣瘯绌挎惌鐩存挱鐨?3 濂?look",
        type: "LIVE",
        priority: "HIGH",
        due_at: at(tomorrow, 15, 0),
        owner: "涓绘挱灏忎竷",
        status: "NOT_STARTED",
        notes: "閲嶇偣璁叉樉鐦︺€佹彁姘旇壊銆侀潰璇曚笉杩囧垎鐢ㄥ姏銆?",
        cadence: "ONE_OFF",
        is_today_focus: 1,
      },
      {
        title: "瀵硅揣锛氭槬瀛ｈタ瑁呭瑁呫€佹祬鍙ｅ崟闉嬪簱瀛?",
        type: "STOCK",
        priority: "HIGH",
        due_at: at(tomorrow, 10, 0),
        owner: "浠撳簱闃挎辰",
        status: "WAITING",
        notes: "纭 M/L 鐮佸拰鏉忚壊琛ヨ揣鑺傚銆?",
        cadence: "ONE_OFF",
        is_today_focus: 1,
      },
      {
        title: "澶嶇洏鏄ㄦ櫄閫氬嫟鐩存挱鐨勫仠鐣欏拰鎴愪氦鏁版嵁",
        type: "DATA",
        priority: "MEDIUM",
        due_at: at(today, 18, 0),
        owner: "鑷繁",
        status: "NOT_STARTED",
        notes: "閲嶇偣鐪嬪墠 5 鍒嗛挓娴佸け鐐瑰拰璇勮鍖洪珮棰戦棶棰樸€?",
        cadence: "DAILY",
        is_today_focus: 0,
      },
      {
        title: "鏁寸悊绔炲搧鏈懆鐖嗘鏍囬缁撴瀯",
        type: "COMPETITOR",
        priority: "MEDIUM",
        due_at: at(fridayLike, 17, 0),
        owner: "鑷繁",
        status: "IN_PROGRESS",
        notes: "鎷嗘垚鈥滀汉缇?+ 鍦烘櫙 + 缁撴灉鈥濇ā鏉裤€?",
        cadence: "WEEKLY",
        is_today_focus: 0,
      },
      {
        title: "姹囨€绘湰鍛ㄧ儹鐐硅瘝鍒伴€夐姹?",
        type: "HOTTOPIC",
        priority: "MEDIUM",
        due_at: at(fridayLike, 20, 0),
        owner: "鑷繁",
        status: "NOT_STARTED",
        notes: "閲嶇偣鐪嬫槬鎷涖€佹瘯涓氬銆侀€氬嫟鏉惧紱鎰熴€?",
        cadence: "WEEKLY",
        is_today_focus: 0,
      },
      {
        title: "瀛︿範 3 涓垎娆剧煭瑙嗛寮€澶撮挬瀛?",
        type: "LEARNING",
        priority: "LOW",
        due_at: at(nextWeek, 16, 30),
        owner: "鑷繁",
        status: "NOT_STARTED",
        notes: "娌夋穩鍒拌剼鏈ā鏉垮簱閲屻€?",
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
        title: "闈㈣瘯绌挎惌鐩存挱棰勫憡",
        content_type: "LIVE_TRAILER",
        audience: "鏄ユ嫑/绀炬嫑濂崇敓",
        scenario: "闈㈣瘯鍓嶄竴鏅氫复鏃舵壘绌挎惌鍙傝€?",
        product: "濂舵补鐧借タ瑁呭瑁?+ 娴呭彛闉?",
        script: "寮€澶村厛鎶涢棶棰橈細闈㈣瘯绌夸粈涔堜笉鍑洪敊锛熶腑娈电粰 3 濂楁惌閰嶏紝鍐嶆彁閱掔洿鎾棿璁茬粏鑺傚拰棰勭畻銆?",
        publish_at: at(today, 19, 30),
        status: "SCRIPTING",
        calendar_label: "CAMPAIGN",
        data_note: "鐩爣鏀惰棌鐜?> 6%锛岃瘎璁哄紩瀵尖€滄兂鐪嬪摢濂椻€濄€?",
      },
      {
        title: "灏忎釜瀛愰€氬嫟鏄鹃珮绌挎惌",
        content_type: "SHORT_VIDEO",
        audience: "150-160cm 閫氬嫟濂崇敓",
        scenario: "涓婄彮鏃忔棩甯哥┛鎼?",
        product: "楂樿叞瑗胯￥ + 鐭タ瑁?",
        script: "鍓?3 绉掑厛灞曠ず鍓嶅悗瀵规瘮锛屽己璋冭叞绾垮拰闉嬭￥鍚岃壊锛屽啀缁欑増鍨嬪缓璁€?",
        publish_at: at(addDays(today, 1), 12, 15),
        status: "SHOOTING",
        calendar_label: "PRODUCTION",
        data_note: "琛ユ媿鍏ㄨ韩姝ｄ晶闈紝瑙傚療瀹屾挱鍜岀偣璧炴瘮銆?",
      },
      {
        title: "姣曚笟瀛ｇ涓€濂楄亴鍦虹┛鎼浘鏂?",
        content_type: "CAROUSEL",
        audience: "搴斿眾姣曚笟鐢?",
        scenario: "姣曚笟绛旇京/鍏ヨ亴绗竴鍛?",
        product: "閽堢粐涓婅。 + 鐩寸瓛鍗婅",
        script: "灏侀潰寮鸿皟鈥滃共鍑€涓嶈€佹皵鈥濓紝姝ｆ枃 6 寮犲浘鎷嗛潰鏂欍€侀厤鑹层€侀瀷鍖呭缓璁€?",
        publish_at: at(addDays(today, 2), 9, 0),
        status: "EDITING",
        calendar_label: "PRODUCTION",
        data_note: "鐪嬫敹钘忓拰绉佷俊灏虹爜鍜ㄨ銆?",
      },
      {
        title: "鐩存挱闂村繀澶?5 浠跺熀纭€娆剧鑽?",
        content_type: "SEEDING",
        audience: "25-32 宀佽交鐔熼€氬嫟浜虹兢",
        scenario: "鐩存挱棰勭儹",
        product: "琛～/瑗胯瑁?涔愮闉?",
        script: "鎸夆€滅渷蹇冩惌閰嶅叕寮忊€濊 5 浠跺熀纭€娆撅紝姣忎欢閮借钀藉埌鍦烘櫙鍜岃韩鏉愰棶棰樸€?",
        publish_at: at(addDays(today, 3), 20, 0),
        status: "IDEA",
        calendar_label: "IDEA_POOL",
        data_note: "寰呯‘璁よ揣鐩樺拰搴撳瓨銆?",
      },
      {
        title: "姊ㄥ舰韬潗鎬庝箞閫夊崐瑁?",
        content_type: "OUTFIT",
        audience: "姊ㄥ舰韬潗濂崇敓",
        scenario: "涓婄彮/绾︿細涓ょ敤",
        product: "A 瀛楀崐瑁?+ 淇韩閽堢粐",
        script: "鍏堣闆峰尯锛屽啀缁?3 涓増鍨嬬瓫閫夋爣鍑嗭紝缁撳熬寮曞璇勮韬潗鍥版壈銆?",
        publish_at: at(addDays(today, 5), 18, 30),
        status: "SCHEDULED",
        calendar_label: "PUBLISH",
        data_note: "浣滀负鍛ㄦ湯钃勬按鍐呭锛屽叧娉ㄨ瘎璁哄尯浜掑姩娣卞害銆?",
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
        screenshot: "灏侀潰鎴浘鍗犱綅",
        source_account: "绌挎惌鐮旂┒鎵€",
        type: "COVER",
        hook_summary: "绾壊鑳屾櫙 + 涓€鐪肩湅鎳傜殑鍦烘櫙鏂囨锛屽皝闈俊鎭壒鍒洿鎺ャ€?",
        reusable_idea: "鐩存挱棰勫憡灏侀潰鍙互鐢ㄢ€滈潰璇曠┛鎼?3 濂楁妱浣滀笟鈥濊繖绉嶆暟瀛楀寲琛ㄨ揪銆?",
        tags: "闈㈣瘯绌挎惌,鐩存挱棰勫憡,灏侀潰",
        captured_at: subDays(today, 1).toISOString(),
      },
      {
        link: "https://www.xiaohongshu.com/explore/title-sample",
        screenshot: "鏍囬鎴浘鍗犱綅",
        source_account: "閫氬嫟绌挎惌鏃ヨ",
        type: "TITLE",
        hook_summary: "鏍囬缁熶竴閲囩敤鈥滀汉缇?+ 鍦烘櫙 + 缁撴灉鈥濈殑鍏紡銆?",
        reusable_idea: "閫傚悎鍋氭瘯涓氬鍜岀ぞ鎷涗富棰樼殑鏍囬妯℃澘銆?",
        tags: "鏍囬,浜虹兢璇?鍦烘櫙璇?",
        captured_at: subDays(today, 2).toISOString(),
      },
      {
        link: "https://www.xiaohongshu.com/explore/copy-sample",
        screenshot: "鏂囨鎴浘鍗犱綅",
        source_account: "闃挎绌挎惌",
        type: "COPY",
        hook_summary: "鏂囨鐢ㄥ彛璇寲鎻愰棶鍒囧叆锛屽儚鍦ㄦ浛鐢ㄦ埛璇磋瘽銆?",
        reusable_idea: "鐩存挱棰勫憡鏂囨绗竴鍙ヤ紭鍏堢敤鐢ㄦ埛鐥涚偣鎻愰棶銆?",
        tags: "鏂囨,鍙ｈ鍖?鐥涚偣",
        captured_at: subDays(today, 3).toISOString(),
      },
      {
        link: "https://www.xiaohongshu.com/explore/video-structure",
        screenshot: "瑙嗛缁撴瀯鎴浘鍗犱綅",
        source_account: "鑱屽満鎰熺┛鎼?",
        type: "VIDEO_STRUCTURE",
        hook_summary: "3 绉掗挬瀛?+ 3 濂楃┛鎼繛鎾?+ 缁撳熬璇勮寮曞锛岃妭濂忓緢蹇€?",
        reusable_idea: "鐭棰戠粨鏋勫彲浠ユ部鐢ㄥ埌涓绘挱棰勫憡鍐呭銆?",
        tags: "瑙嗛缁撴瀯,閽╁瓙,鑺傚",
        captured_at: subDays(today, 4).toISOString(),
      },
      {
        link: "https://www.xiaohongshu.com/explore/comment-insight",
        screenshot: "璇勮鎴浘鍗犱綅",
        source_account: "闈㈣瘯绌挎惌绗旇",
        type: "COMMENTS",
        hook_summary: "楂樿禐璇勮闆嗕腑鍦ㄢ€滈绠椻€濃€滄樉鐦︹€濃€滀笉鏄惧鐢熸皵鈥濄€?",
        reusable_idea: "鎶婅繖浜涜瘝鐩存帴鍔犲叆鐩存挱鍙ｆ挱鍜岃瘎璁哄尯棰勫煁璇濇湳銆?",
        tags: "璇勮鍖?楂樿禐,鐢ㄦ埛璇█",
        captured_at: addHours(today, -18).toISOString(),
      },
      {
        link: "https://www.xiaohongshu.com/explore/audio-sample",
        screenshot: "闊虫晥鎴浘鍗犱綅",
        source_account: "鍩庡競閫氬嫟鎰?",
        type: "AUDIO",
        hook_summary: "杞诲揩鑺傚鐨勯€氬嫟姘涘洿闊充箰锛岄€傚悎鍩庡競鎰熺┛鎼€?",
        reusable_idea: "閫傚悎棰勫憡鐗囧ご鍜屼笂韬睍绀恒€?",
        tags: "闊虫晥,閫氬嫟姘涘洿,鍩庡競鎰?",
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
        account_name: "鐧芥鑱屽満绌挎惌",
        platform: "XIAOHONGSHU",
        content_link: "https://www.xiaohongshu.com/explore/comp-1",
        content_topic: "闈㈣瘯绌挎惌閬块浄",
        hook_point: "寮€澶寸洿鎺ヨ鈥滆繖 3 濂楀崈涓囧埆绌垮幓闈㈣瘯鈥濄€?",
        comment_insight: "鐢ㄦ埛瀵光€滀笉瑕佸お瀛︾敓姘斺€濆拰鈥滄樉绮剧鈥濊璁烘渶澶氥€?",
        takeaway: "鍋氬弽宸紡寮€澶存洿瀹规槗璁╃敤鎴峰仠鐣欙紝鍚庨潰鍐嶉『鎺ヨВ鍐虫柟妗堛€?",
        observed_at: subDays(today, 1).toISOString(),
      },
      {
        account_name: "涓婄彮杩欐牱绌?",
        platform: "DOUYIN",
        content_link: "https://www.douyin.com/video/comp-2",
        content_topic: "灏忎釜瀛愰€氬嫟鏄鹃珮",
        hook_point: "鍏堜笂韬姣旓紝鍐嶇粰缁撹锛屽墠 2 绉掍俊鎭潪甯稿瘑銆?",
        comment_insight: "鐢ㄦ埛浼氳拷闂叿浣撹￥闀垮拰闉嬭窡楂樺害銆?",
        takeaway: "鑴氭湰閲岃鎶婂昂瀵镐俊鎭寰楁洿鍏蜂綋锛屼笉鐒惰瘎璁哄尯瀹规槗鍙嶅闂€?",
        observed_at: subDays(today, 2).toISOString(),
      },
      {
        account_name: "鏅氭櫄鐩存挱闂?",
        platform: "TAOBAO_LIVE",
        content_link: "https://www.taobao.com/live/comp-3",
        content_topic: "鐩存挱棰勭儹鍙ｆ挱鑺傚",
        hook_point: "鍙嶅寮鸿皟鈥滀粖鏅?8 鐐癸紝鐜板満鏁欎綘鎸戠増鍨嬧€濄€?",
        comment_insight: "鐢ㄦ埛鏇村悆鍏蜂綋鍒╃泭鐐癸紝涓嶅悆绌烘硾鈥滃埆閿欒繃鈥濄€?",
        takeaway: "棰勫憡閲岃鏄庣‘璇寸洿鎾兘瑙ｅ喅浠€涔堥棶棰橈紝鑰屼笉鏄彧鍐欐椂闂淬€?",
        observed_at: addHours(today, -10).toISOString(),
      },
      {
        account_name: "鏉惧紱鎰熼€氬嫟",
        platform: "WECHAT_VIDEO",
        content_link: "https://video.weixin.qq.com/comp-4",
        content_topic: "鏄ュ閽堢粐涓婅。鎺ㄨ崘",
        hook_point: "闀滃ご璇█骞插噣锛屼汉鐗╄〃鎯呮斁鏉撅紝寰堟湁淇′换鎰熴€?",
        comment_insight: "鐢ㄦ埛浼氳鈥滄棩甯歌兘澶嶅埗鈥濈殑绌挎惌鍦烘櫙鍚稿紩銆?",
        takeaway: "鎷嶆憚鏃惰澶氱粰鍑鸿蛋璺€佸潗涓嬨€佹嬁鍖呰繖绫荤湡瀹為€氬嫟鍔ㄤ綔銆?",
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
        keyword: "闈㈣瘯绌挎惌",
        type: "SCENE",
        source: "灏忕孩涔︽悳绱㈣仈鎯?",
        happened_at: today.toISOString(),
        usable_direction: "鍙仛鐩存挱棰勫憡銆佸浘鏂囨竻鍗曘€侀伩闆风煭瑙嗛銆?",
      },
      {
        keyword: "閫氬嫟鏉惧紱鎰?",
        type: "EMOTION",
        source: "璇勮鍖洪珮棰戣瘝",
        happened_at: today.toISOString(),
        usable_direction: "閫傚悎鍋氭棩甯搁€氬嫟椋庢牸鍖栬〃杈撅紝鎻愬崌鍐呭鎯呯华浠峰€笺€?",
      },
      {
        keyword: "灏忎釜瀛愭樉楂?",
        type: "AUDIENCE",
        source: "绔炲搧鏍囬",
        happened_at: subDays(today, 1).toISOString(),
        usable_direction: "閫傚悎鍋氱煭瑙嗛鍜岃疆鎾浘灏侀潰鍏抽敭璇嶃€?",
      },
      {
        keyword: "姣曚笟瀛ｇ涓€濂楄亴鍦虹┛鎼?",
        type: "TREND",
        source: "鏄ユ嫑鑺傜偣",
        happened_at: subDays(today, 2).toISOString(),
        usable_direction: "閫傚悎鍛ㄤ笓棰橈紝甯﹀叆鏂颁汉鎴愰暱鎰熴€?",
      },
      {
        keyword: "姊ㄥ舰韬潗閬儻",
        type: "AUDIENCE",
        source: "绉佷俊鍜ㄨ",
        happened_at: subDays(today, 3).toISOString(),
        usable_direction: "閫傚悎鍋氬崐瑁欍€侀様鑵胯￥銆佺増鍨嬭瑙ｅ唴瀹广€?",
      },
      {
        keyword: "杞婚€氬嫟",
        type: "TREND",
        source: "骞冲彴鐑",
        happened_at: addHours(today, -3).toISOString(),
        usable_direction: "閫傚悎鐩存挱闂存暣鍦鸿揣鐩樼殑椋庢牸鎬讳富棰樸€?",
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
        "浠婂ぉ鎷嶄簡 4 灏忔椂锛岃窡杩涗簡鎽勫奖锛屽嚭浜?1 鏉℃枃妗堬紝鏅氫笂澶嶇洏浜嗙洿鎾暟鎹紝鏄庡ぉ瑕佸璐у拰璺熶富鎾鎼厤銆?",
      daily_report:
        "浠婃棩瀹屾垚浜嗙洿鎾浉鍏虫媿鎽?4 灏忔椂锛屽凡璺熻繘鎽勫奖鎺掓湡涓庤ˉ鎷嶄簨椤癸紝浜у嚭 1 鏉￠鍛婃枃妗堬紝骞跺畬鎴愭櫄闂寸洿鎾暟鎹垵姝ュ鐩樸€?",
      weekly_draft:
        "鏈懆鍥寸粫鏄ュ閫氬嫟涓庨潰璇曠┛鎼富棰橈紝鎺ㄨ繘浜嗙洿鎾鍛娿€佹媿鎽勫崗鍚屻€佹枃妗堜骇鍑轰笌鏁版嵁澶嶇洏锛屽唴瀹归摼璺熀鏈畬鏁达紝鍚庣画閲嶇偣鏀惧湪瀵硅揣纭涓庝富鎾惌閰嶇（鍚堛€?",
      email_subject: "銆愭棩鎶ャ€戞槬瀛ｉ€氬嫟鐩存挱鍐呭鎺ㄨ繘鎯呭喌",
      email_body:
        "浠婃棩瀹屾垚浜嗙洿鎾媿鎽勪笌鎽勫奖璺熻繘锛屽凡杈撳嚭 1 鏉￠鍛婃枃妗堬紝骞跺鏅氶棿鐩存挱鏁版嵁鍋氬垵姝ュ鐩樸€傛槑鏃ヨ鍒掑厛瀹屾垚瀵硅揣锛屽啀涓庝富鎾‘璁ゆ惌閰嶇粏鑺傘€?",
      created_at: stamp,
    });

    const engagementSamples = [
      {
        title: "鍛ㄤ竴涓婂崍鏉ユ槑绠＄悊鍝佺墝鏂瑰鎼?",
        type: "MEETING",
        date: getAppDateKey(today),
        time: "10:30",
        contact_name: "鏉ユ槑",
        contact_role: "BRAND",
        note: "鍚庡崐骞磋鍗曡繎鏈?3 鍛ㄦ墦鏍囧噯锛屾槸鍚﹁兘鎶婇兘甯傞€氬嫟绠楀叆鍐呭鏍囬銆?",
        reference_links: JSON.stringify([
          "https://www.xiaohongshu.com/explore/brand-brief-1",
        ]),
        status: "PENDING",
        remark: "鍙敤 15 鍒嗛挓銆?",
      },
      {
        title: "绾︽媿鏄庢棩鏄ユ嫑绌挎惌鍙互鍚楋紵",
        type: "SHOOTING",
        date: getAppDateKey(addDays(today, 1)),
        time: "14:00",
        contact_name: "娲",
        contact_role: "PHOTOGRAPHER",
        note: "涓婃鍥剧煭鏍煎紡鍙嶅搷濂斤紝璇曡瘯鏇村鑳屾櫙鏁堟灉銆?",
        reference_links: JSON.stringify([
          "https://www.xiaohongshu.com/explore/shooting-reference-1",
        ]),
        status: "IN_PROGRESS",
        remark: null,
      },
      {
        title: "涓绘挱璺熸惌閰嶇敤鎴峰鏈嶈娴硅",
        type: "LIVE",
        date: getAppDateKey(addDays(today, 2)),
        time: "16:30",
        contact_name: "涓绘挱灏忎竷",
        contact_role: "HOST",
        note: "鍙ｆ挱鏍稿績鏄樉鐦︺€佹樉鍏冩皵锛岄棶绛旀儏缁?",
        reference_links: JSON.stringify([]),
        status: "PENDING",
        remark: "鍔犱竴娆″疄鍦烘媿鎽勫悗瀹屾垚銆?",
      },
      {
        title: "瀵硅揣锛氱鏈嬬┛鎼?M/L 瓒冲夠鍊?",
        type: "STOCK",
        date: getAppDateKey(addDays(today, 3)),
        time: "11:00",
        contact_name: "浠撳簱闃挎辰",
        contact_role: "COLLEAGUE",
        note: "鎺掑簭澶氬嚭 6 濂楀疄鎷嶇殑绌挎惌銆?",
        reference_links: JSON.stringify([
          "https://www.xiaohongshu.com/explore/stock-look-1",
        ]),
        status: "PENDING",
        remark: null,
      },
      {
        title: "璋冭揣锛氱増鍨嬭瘯鐪嬫槸鍚﹀畬鏁?",
        type: "TRANSFER",
        date: getAppDateKey(addDays(today, 4)),
        time: null,
        contact_name: "鐜嬪皬璐?",
        contact_role: "COLLEAGUE",
        note: "鏍囬鍜岀┛鎼繛鎾皟鏁寸殑琛ｆ湇鍚屾璧版暣。",
        reference_links: JSON.stringify([]),
        status: "PENDING",
        remark: "濡傛灉琛ｆ湇涓嶅齐锛屾敼鎴愬鐢熸皵。",
      },
    ];

    engagementSamples.forEach((item) =>
      insertWeeklyEngagement.run({
        id: randomUUID(),
        created_at: stamp,
        updated_at: stamp,
        ...item,
      }),
    );
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
