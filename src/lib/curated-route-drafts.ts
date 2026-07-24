import type { JourneyRole, Theme } from "@/lib/route";

export type EditorialSourceKind =
  | "official"
  | "authority"
  | "academic"
  | "cultural"
  | "map";

export type EditorialSource = {
  id: string;
  title: string;
  publisher: string;
  url: string;
  kind: EditorialSourceKind;
  checkedAt: string;
};

export type CuratedRouteDraftStop = {
  id: string;
  name: string;
  journeyRole: Exclude<JourneyRole, "user_anchor">;
  purpose: string;
  sourceIds: string[];
  deepReadingFocus?: string;
  taskDirection?: string;
  researchKeywords?: string[];
  editorialNotes?: string[];
  reviewNote?: string;
};

export type CuratedRouteDraftScheduleItem = {
  time: string;
  title: string;
  detail: string;
  kind: "步行" | "骑行" | "参观" | "用餐" | "交通";
};

export type CuratedRouteDraft = {
  id: string;
  city: string;
  title: string;
  centralQuestion: string;
  summary: string;
  narrativeArc: [string, string, string, string];
  storyHighlights: [string, string, string];
  bestFor: string;
  themes: Theme[];
  pace: "轻松" | "平衡" | "紧凑";
  duration: "半天" | "一天";
  status: "review";
  stops: CuratedRouteDraftStop[];
  sources: EditorialSource[];
  reviewFocus: string[];
  schedule?: CuratedRouteDraftScheduleItem[];
};

const checkedAt = "2026-07-23";
const latestCheckedAt = "2026-07-24";

// 这里是供人工审阅的内容底稿，而非可直接出发的正式路线。
// 只收录有明确文化意义和可追溯资料的站点；开放信息、步行距离和入场规则仍需出发日前复核。
export const curatedRouteDrafts: CuratedRouteDraft[] = [
  {
    id: "nanjing-modern-history-draft",
    city: "南京",
    title: "近代南京的几次转身",
    centralQuestion: "一座城市如何在近代政治、战争与日常生活之间不断改变自己？",
    summary: "以政权空间、谈判现场、战争记忆与公共纪念为线索，理解南京近代史怎样留在城市里。",
    narrativeArc: [
      "从总统府的多重前身，看一座城市如何被不同政权使用。",
      "在梅园新村，把国家叙事落回谈判、居住与工作发生的院落。",
      "走到拉贝故居，理解战争中普通人的避难与跨国互助。",
      "在纪念馆收束：城市怎样保存创伤，并把记忆交给今天。",
    ],
    storyHighlights: ["政权如何塑造空间", "战时的选择与互助", "纪念为何属于今天"],
    bestFor: "第一次想系统理解南京近代史，并愿意留出安静阅读时间的人",
    themes: ["历史", "建筑"],
    pace: "平衡",
    duration: "一天",
    status: "review",
    stops: [
      {
        id: "presidential-palace",
        name: "总统府",
        journeyRole: "anchor",
        purpose: "用一组建筑的多次易名和易主，开启近代南京的政治空间叙事。",
        sourceIds: ["presidential-palace"],
      },
      {
        id: "meiyuan-new-village",
        name: "梅园新村纪念馆",
        journeyRole: "support",
        purpose: "把宏大政治放进代表团居住、办公与谈判的具体街巷尺度。",
        sourceIds: ["meiyuan-new-village"],
      },
      {
        id: "rabe-house",
        name: "拉贝与国际安全区纪念馆",
        journeyRole: "support",
        purpose: "以一处住宅和日记材料，讨论战争、避难与个体责任。",
        sourceIds: ["rabe-house"],
      },
      {
        id: "nanjing-massacre-memorial",
        name: "侵华日军南京大屠杀遇难同胞纪念馆",
        journeyRole: "ending",
        purpose: "以公共纪念结束路线，讨论历史证据、悼念与城市记忆。",
        sourceIds: ["nanjing-museum-opening"],
        reviewNote: "需在发布前复核预约、闭馆日、参观时长和情绪提示。",
      },
    ],
    sources: [
      {
        id: "presidential-palace",
        title: "总统府",
        publisher: "南京党史网",
        url: "https://dsb.nanjing.gov.cn/yzyj/201311/t20131114_2083939.html",
        kind: "authority",
        checkedAt,
      },
      {
        id: "meiyuan-new-village",
        title: "南京城镇建设综合开发志中的梅园新村纪念馆条目",
        publisher: "南京市地方志编纂委员会",
        url: "https://dfz.nanjing.gov.cn/ztzl/njzj/szcs/200806/P020210517593449759288.pdf",
        kind: "authority",
        checkedAt,
      },
      {
        id: "rabe-house",
        title: "拉贝与国际安全区纪念馆",
        publisher: "南京党史网",
        url: "https://dsb.nanjing.gov.cn/yzyj/201412/t20141217_2083976.html",
        kind: "authority",
        checkedAt,
      },
      {
        id: "nanjing-museum-opening",
        title: "南京国有文化场馆与景区公开信息",
        publisher: "南京市人民政府",
        url: "https://www.nanjing.gov.cn/zdgk/202304/t20230414_3887776.html",
        kind: "official",
        checkedAt,
      },
    ],
    reviewFocus: [
      "确认全程步行与必要公共交通的边界，不把跨城距离伪装为顺路。",
      "为纪念馆补充出发日前预约、开放和情绪提示。",
      "深读需分别处理政治史、战争史与纪念叙事，避免把它们压成单一情绪。",
    ],
  },
  {
    id: "nanjing-republican-architecture-draft",
    city: "南京",
    title: "民国建筑与城市生活",
    centralQuestion: "建筑怎样塑造一座城市的日常尺度、居住方式与公共生活？",
    summary: "不把建筑只当作拍照背景，而是从街道、院落、住宅与今天的使用方式读懂民国南京。",
    narrativeArc: [
      "先进入颐和路，辨认街道尺度、坡地与院落如何共同组织生活。",
      "从历史建筑保护与更新，理解“修旧如旧”具体在保护什么。",
      "转向杨廷宝与童寯的自宅，比较建筑师如何把专业判断放进自己的日常居所。",
      "以鼓楼校园周边的文教建筑收束，回到知识、居住与城市生活仍在发生的空间。",
    ],
    storyHighlights: ["街道尺度从哪里来", "建筑师怎样设计自己的家", "保护如何进入今天生活"],
    bestFor: "喜欢建筑、摄影与街区观察，愿意慢走并阅读现场细节的人",
    themes: ["建筑", "历史"],
    pace: "轻松",
    duration: "半天",
    status: "review",
    stops: [
      {
        id: "yihe-road-district",
        name: "颐和路历史文化街区",
        journeyRole: "anchor",
        purpose: "从道路、绿荫和院落组织方式进入民国住宅区的整体尺度。",
        sourceIds: ["yihe-road-chronicle", "yihe-road-protection"],
      },
      {
        id: "yihe-road-digital-exhibition",
        name: "颐和路数字展示馆",
        journeyRole: "support",
        purpose: "把街区保护、修缮与当代使用放进同一段叙事。",
        sourceIds: ["yihe-road-protection"],
        reviewNote: "需确认是否开放、是否需要预约及实际停留时长。",
      },
      {
        id: "nju-gulou-campus",
        name: "南京大学鼓楼校区文教建筑（外观观察）",
        journeyRole: "bridge",
        purpose: "把公馆区的住宅尺度转向校园和文教空间，理解知识机构如何进入城市日常。",
        sourceIds: ["nju-library-history"],
        reviewNote: "仅按外观观察设计；校内进入规则与可停留区域须出发日前确认。",
      },
      {
        id: "yang-tingbao-residence",
        name: "杨廷宝住宅（外观观察）",
        journeyRole: "support",
        purpose: "在建筑师为自己设计的住宅前，观察简洁、实用与居住尺度如何落到具体细部。",
        sourceIds: ["yang-tingbao-residence"],
        reviewNote: "当前只按街道外观观察设计；内部参观与临时管控须出发日前确认。",
      },
      {
        id: "tong-jun-residence",
        name: "童寯故居与童寯建筑馆",
        journeyRole: "ending",
        purpose: "以童寯亲自设计的住宅及其相邻建筑馆收束，讨论私人居所、建筑档案与城市公共文化的关系。",
        sourceIds: ["tong-jun-residence"],
        reviewNote: "故居与建筑馆的预约、开放时段及当日展览须出发日前确认。",
      },
    ],
    sources: [
      {
        id: "yihe-road-chronicle",
        title: "江苏省情影像志《乡土江苏·颐和路街区》启动报道",
        publisher: "南京市地方志工作办公室",
        url: "https://dfz.nanjing.gov.cn/gzdt/202412/t20241212_5031250.html",
        kind: "authority",
        checkedAt,
      },
      {
        id: "yihe-road-protection",
        title: "关于提升颐和路民国建筑群文化名片功能的提案答复",
        publisher: "南京市人民政府",
        url: "https://www.nanjing.gov.cn/xxgkn/jytabljggk/2024njytabl/shizxta/202411/t20241120_5014183.html",
        kind: "official",
        checkedAt,
      },
      {
        id: "nju-library-history",
        title: "馆史概况",
        publisher: "南京大学图书馆",
        url: "https://lib.nju.edu.cn/gytsg/gsgk.htm",
        kind: "official",
        checkedAt,
      },
      {
        id: "yang-tingbao-residence",
        title: "杨廷宝住宅",
        publisher: "南京市住房保障和房产局",
        url: "https://fcj.nanjing.gov.cn/ztzl/fwgl/jxdjzzs/202510/t20251020_5672295.html",
        kind: "official",
        checkedAt,
      },
      {
        id: "tong-jun-residence",
        title: "东南大学亚洲建筑档案中心分馆（童寯建筑馆）成立",
        publisher: "东南大学建筑学院",
        url: "https://arch.seu.edu.cn/2025/1210/c9118a548161/page.htm",
        kind: "official",
        checkedAt,
      },
    ],
    reviewFocus: [
      "逐点确认可进入性，不能把居民院落或校园内部当作默认开放景点。",
      "明确哪些内容只能做街道外观观察，哪些可以进入展馆。",
      "补齐颐和路、鼓楼、成贤街与文昌巷之间的实际交通、无障碍、施工与绕行信息。",
    ],
  },
  {
    id: "nanjing-literature-bookstores-draft",
    city: "南京",
    title: "书页里的南京",
    centralQuestion: "文学、出版和阅读空间怎样把一座城市写进人的日常？",
    summary: "从四家位置与气质不同的书店出发，读实体阅读空间怎样连接个人、校园与城市日常。",
    narrativeArc: [
      "从朴阅书店的阅读现场开始，先问今天的人为什么仍需要实体书店。",
      "在先锋五台山店，看书店如何嵌进城市的公共文化空间。",
      "走到南京大学周边的学人书店，转向校园附近的知识与阅读日常。",
      "以方所结束，比较独立书店、校园书店与商业阅读空间如何各自服务城市读者。",
    ],
    storyHighlights: ["实体书店为何仍重要", "校园附近怎样形成阅读日常", "不同书店如何服务不同读者"],
    bestFor: "喜欢书店、图书馆、文学和慢节奏城市观察的人",
    themes: ["文学", "书店", "历史"],
    pace: "轻松",
    duration: "半天",
    status: "review",
    stops: [
      {
        id: "puyue-bookstore",
        name: "朴阅书店",
        journeyRole: "anchor",
        purpose: "从一间位于老学堂创意园的书店开始，打开“城市怎样为慢阅读留出空间”的问题。",
        sourceIds: ["puyue-amap"],
        reviewNote: "书店内容需以店方公开资料或实地观察补齐；当前地图资料只支持地点和营业信息。",
      },
      {
        id: "pioneer-wutaishan",
        name: "先锋书店（五台山总店）",
        journeyRole: "support",
        purpose: "从正在发生的实体阅读现场，进入“城市为何需要书店”的问题。",
        sourceIds: ["pioneer-amap"],
        reviewNote: "书店内容需以实地观察和店方公开信息补齐，避免套用泛化书店叙事。",
      },
      {
        id: "scholar-bookstore",
        name: "学人书店（陶谷新村）",
        journeyRole: "support",
        purpose: "把个人阅读放进南京大学周边的校园街区，观察书店与知识机构如何彼此靠近。",
        sourceIds: ["scholar-amap"],
        reviewNote: "唯楚书店与学人书店在同一地址附近；发布前须实地确认两家店的独立经营、入口与适合的停留方式。",
      },
      {
        id: "fangsuo-bookstore",
        name: "方所（金陵中環店）",
        journeyRole: "ending",
        purpose: "把不同尺度的书店放在一起比较：当阅读走进商业综合体，它仍能如何成为停留与交流的空间。",
        sourceIds: ["fangsuo-amap"],
        reviewNote: "只使用地图可核验的地点信息；书店活动、选书风格与服务须以店方当日公开信息复核。",
      },
    ],
    sources: [
      {
        id: "puyue-amap",
        title: "朴阅书店地点信息",
        publisher: "高德地图",
        url: "https://www.amap.com/place/B0IRF5AJXC",
        kind: "map",
        checkedAt,
      },
      {
        id: "pioneer-amap",
        title: "先锋书店（五台山总店）地点信息",
        publisher: "高德地图",
        url: "https://www.amap.com/place/B001905YQ1",
        kind: "map",
        checkedAt,
      },
      {
        id: "scholar-amap",
        title: "学人书店（陶谷新村）地点信息",
        publisher: "高德地图",
        url: "https://www.amap.com/place/B0FFF90DI3",
        kind: "map",
        checkedAt,
      },
      {
        id: "fangsuo-amap",
        title: "方所（金陵中環店）地点信息",
        publisher: "高德地图",
        url: "https://www.amap.com/place/B0LAVMV2SD",
        kind: "map",
        checkedAt,
      },
    ],
    reviewFocus: [
      "四家书店当前均只有地图级地点资料；发布前须补齐店方公开资料或实地采访，不能凭地点信息写历史故事。",
      "确认书店的实际营业、拍摄、活动与团体停留规则，并标注推荐交通方式。",
      "远行书店、奇点书集、锦创书城不在这一版主线：前者偏离当前线路，后两者尚未在高德检索中形成可核验地点结果。",
    ],
  },
  {
    id: "nanjing-watergate-to-bookstore-draft",
    city: "南京",
    title: "人间烟火：一座城市的日常",
    centralQuestion: "一座城市的日常，怎样从城门、银行、教堂与商号，一路走到书店和建筑师的家？",
    summary: "从水西门一带出发，沿太平南路读民国金融、宗教与商业空间，再经童寯故居，在朴阅书店结束这段城市阅读。",
    narrativeArc: [
      "从水西门广场出发，先把城门、河道与今天的日常交通放在同一张城市底图上。",
      "在中南银行和圣保罗堂之间，观察金融与宗教建筑怎样共同塑造民国街区的公共立面。",
      "沿太平南路经过庆和昌记、太平商场与古籍书店，追问一条商业街怎样留下阅读与消费的记忆。",
      "穿过西白菜园抵达童寯故居，再以朴阅书店收束：旧城空间如何继续容纳今天的阅读生活。",
    ],
    storyHighlights: ["城门与城市边界", "金融、教堂与商业街", "从旧书店走向今天的阅读"],
    bestFor: "愿意早起、接受短骑行，并想把建筑观察和书店停留放进同一天的人",
    themes: ["历史", "建筑", "书店"],
    pace: "平衡",
    duration: "一天",
    status: "review",
    stops: [
      {
        id: "handmade-wonton-mochou-new-village",
        name: "手巧馄饨（莫愁新村店）",
        journeyRole: "rest",
        purpose: "把早餐作为这一天的第一站：从一间社区小店进入莫愁新村周边的清晨生活，而不是把用餐压缩成赶路间隙。",
        sourceIds: ["handmade-wonton-amap"],
        deepReadingFocus: "用地点资料、南京馄饨的一般背景和编辑实地观察讲清社区早餐的节奏：此店不是常见的“泡泡馄饨”印象，重点看馅料的扎实与轻盈口感、香而不浇汤的固体辣子；不得把店铺沿革、口碑或招牌故事写成未经核验的历史。",
        taskDirection: "在允许拍摄处记录馄饨、固体辣子和早晨客流中的一个细节；再观察拼桌或等位怎样组织这间小店的日常。",
        researchKeywords: ["手巧馄饨 固体辣子", "南京 泡泡馄饨", "成诚酥烧饼"],
        editorialNotes: [
          "编辑实地观察：馅料扎实而有轻盈的空气感，辣味来自格外香的固体辣子，不浇辣油。",
          "编辑实地观察：店内只售馄饨，分中碗、大碗、特大碗，可加火腿肠和鸡蛋；附近成诚酥烧饼的芝麻烧饼、葱油烧饼可搭配。",
          "编辑实地观察：微信、支付宝均可；容易排队，可能需室外或拼桌用餐。",
        ],
        reviewNote: "目前店铺资料仍以地图和编辑实地观察为主；不要写成有烧饼、浇辣油或只收现金/微信。菜单、营业、排队与座位以当天现场为准。",
      },
      {
        id: "water-west-gate-square",
        name: "水西门广场与三山门遗址碑",
        journeyRole: "anchor",
        purpose: "以水边、广场和遗址碑打开路线，建立城门、河道与今天交通的空间感，而不是替代完整的遗址讲解。",
        sourceIds: ["water-west-gate-map", "three-mountain-gate-map"],
        deepReadingFocus: "从城门周边、水系、遗址碑与城市边界讲空间变化，并清楚区分可核验事实与现场观察。",
        taskDirection: "在广场或碑文中找出一条仍能提示旧城边界的视线、地名或方位。",
        reviewNote: "地图资料只支持地点与导航；现场须以明确标识为准，不把水西门广场误称为完整城门遗址。",
      },
      {
        id: "shangxin-pavilion",
        name: "赏心亭",
        journeyRole: "support",
        purpose: "作为水西门一带的独立观察点，停下来辨认水边视野、亭与广场在今天如何被使用。",
        sourceIds: ["water-west-gate-map"],
        deepReadingFocus: "优先检索亭名、历史沿革和文学关联；必须把辛弃疾的《水龙吟·登建康赏心亭》《念奴娇·登建康赏心亭呈史留守致道》《满江红·建康史帅致道席上赋》作为三首文本线索，并只在核对文本后解释它们各自怎样把登临、吊古与建康写进词里。资料不足时只写现场视野与公共空间，不补造典故。",
        taskDirection: "选择一处能同时看到水面、道路或人流的角度，任选一首词的一个意象，写下一句对应的现场观察。",
        researchKeywords: ["辛弃疾 水龙吟 登建康赏心亭", "辛弃疾 念奴娇 登建康赏心亭 呈史留守致道", "辛弃疾 满江红 建康史帅致道席上赋"],
        reviewNote: "亭名历史和文学材料须逐条核验；三首词原文已附入本路线的编辑补充材料，发布前再与可靠古籍或校勘本核对。",
      },
      {
        id: "zhongnan-bank-former-site",
        name: "中南银行南京分行旧址（外观）",
        journeyRole: "support",
        purpose: "从转角入口、钟楼和原营业厅方向，观察民国金融建筑如何面向街道展示秩序与信誉。",
        sourceIds: ["zhongnan-bank-official"],
        deepReadingFocus: "检索中南银行在南京的机构史、建筑年代和保护信息，再解释金融建筑为何重视入口、立面与可见性。",
        taskDirection: "从街对面找出最能表现建筑转角、入口或尺度的一处细部。",
        reviewNote: "按外观观察设计；当前使用状态和进入规则须出发日前确认。",
      },
      {
        id: "saint-pauls-church",
        name: "圣保罗堂",
        journeyRole: "support",
        purpose: "在教堂的钟楼、礼拜空间与传统构架之间，补上太平南路公共生活中宗教建筑的一页。",
        sourceIds: ["saint-pauls-official"],
        deepReadingFocus: "从堂史、建筑构件与礼拜空间讲宗教建筑如何进入街区公共生活，避免虚构人物到访或宗教仪式细节。",
        taskDirection: "在不打扰宗教活动的前提下，辨认钟楼、入口或一处结构细节。",
        reviewNote: "按 09:00 开门的当日计划安排；如遇礼拜或不对散客开放，改为外观观察。",
      },
      {
        id: "qinghechangji-former-branch",
        name: "浙江庆和昌记支店旧址（外观）",
        journeyRole: "support",
        purpose: "在一处可核验的民国商号旧址前，观察商店建筑怎样被嵌进太平南路连续的商业立面。",
        sourceIds: ["qinghechangji-official", "qinghechangji-cultural", "taiping-road-renewal-official"],
        deepReadingFocus: "先以官方名录确认旧址、民国年代和太平南路382号，再从外墙仍可见的繁体店名字迹读商号立面。可把它作为“浙帮银楼进入南京商业街”的线索，解释商帮不是抽象标签，而是通过分店、字号与街面招牌进入城市日常；1911年建成、民国时期天升永五金电料号、2017年修缮等细节必须找到可直接对应的档案或官方来源后才能写成事实。",
        taskDirection: "找出繁体店名字迹或一处能提示旧商号的立面细节；再比较它与相邻店铺的门头尺度。",
        researchKeywords: ["浙江庆和昌记支店 1911", "浙江庆和昌记 天升永 五金电料号", "南京 浙商 银楼 太平南路", "浙江庆和昌记 修缮 2017"],
        reviewNote: "官方名录可确认该旧址在太平南路382号、年代为民国；“1911年建成”“天升永五金电料号”“2017年修缮保护”仍是待查线索，不能提前写成确定事实。",
      },
      {
        id: "jiangsu-hotel-taiping-south-road",
        name: "江苏饭店及太平南路 305 号沿街建筑（外观）",
        journeyRole: "bridge",
        purpose: "在饭店与沿街建筑前观察商业街不同年代的功能叠加，作为庆和昌记与太平商场之间的过渡。",
        sourceIds: ["jiangsu-hotel-official", "taiping-road-renewal-official"],
        deepReadingFocus: "优先核验“原安乐酒店”等名称、沿革与建筑关系；可将安乐酒店与1937年12月14日臧仲卿呈文、日占时期太平路花牌楼段及“南京饭店”名称作为档案检索线索，但只有取得可直接对应的南京市档案馆档案、权威出版物或官方说明后，才能叙述遇难、强占或慰安所性质。未补到可靠来源前，只讲当前街道使用与更新。",
        taskDirection: "比较饭店与相邻沿街建筑的入口、招牌和临街尺度。",
        researchKeywords: ["南京 安乐酒店 太平路", "臧仲卿 呈文 1937年12月14日", "太平路 花牌楼 南京饭店 日占", "南京市档案馆 安乐酒店"],
        reviewNote: "“原安乐酒店”的建筑关系，以及用户提供的臧仲卿呈文、日占时期“南京饭店”与高级慰安所线索，均须补到直接档案出处；现阶段不作为确定事实写入深读。",
      },
      {
        id: "taiping-shopping-mall",
        name: "太平商场（外观）",
        journeyRole: "bridge",
        purpose: "用一座民国时期的商场，讨论现代零售、商号集合与一条商业街的公共生活。",
        sourceIds: ["taiping-shopping-mall-official", "taiping-shopping-mall-archives"],
        deepReadingFocus: "从开业、商号组织与复业材料讲零售空间如何改变消费日常，并与周边小商号形成对照。补检“锦华湘绣庄”：如档案、权威媒体或经过平台审核的百科词条能直接对应太平商场内的中共地下党秘密联络点及其与渡江战役情报的关系，可将其作为商业空间在战争年代的另一层用途；否则不补造细节。",
        taskDirection: "在外立面或出入口附近找到一处能让你判断“商场”尺度的线索。",
        researchKeywords: ["太平商场 锦华湘绣庄 渡江战役", "锦华湘绣庄 地下党 联络点", "南京 太平商场 档案"],
        reviewNote: "当前按外观观察；临时施工、营业与进入规则须当天确认。",
      },
      {
        id: "ancient-bookstore-taiping-south-road",
        name: "古籍书店（原中华书局南京分局，外观）",
        journeyRole: "bridge",
        purpose: "从一间书店旧址进入太平南路的出版与阅读记忆，连接前面的商业街与下午的当代书店。",
        sourceIds: ["ancient-bookstore-official", "taiping-road-bookstreet-authority"],
        deepReadingFocus: "以中华书局南京分局和“书店街”的可靠材料讲出版、教材与城市阅读：可明确说明市委公开答复中所记的前身、1913年建成、暂停营业及房屋检测后的修缮方向；优先检索南京市委最新公开安排或提案答复，并标出答复发布日期。所有“重新开放”表述只能写成该答复中的规划、进度或目标，不能写成已经实现。",
        taskDirection: "从门头、橱窗或周边街名中找一处能引出“书店街”问题的线索。",
        researchKeywords: ["中华书局南京分局 古籍书店 1913", "南京 古籍书店 复业 修缮 市委宣传部", "南京市委 古籍书店 最新安排 答复", "南京 太平南路 书店街"],
        reviewNote: "市委公开答复载明：2019年暂停营业、2022年房屋检测为C级危房，当时不具备复业条件，后续为修缮与活化利用规划。当前是否已开放须当天确认；本稿只安排外观，不承诺入店或购书。",
      },
      {
        id: "west-cabbage-garden",
        name: "西白菜园历史风貌区（街巷观察）",
        journeyRole: "bridge",
        purpose: "从商业街转入居住街巷，观察小尺度住区、更新与居民日常怎样改变行走速度和观看方式。",
        sourceIds: ["west-cabbage-garden-official"],
        deepReadingFocus: "检索历史风貌区范围、更新与保护资料，把它放在老城居住街巷与近现代建筑保护利用的脉络中。增加两段短人物肖像：谭道源的北伐经历，以及陈鹤琴在幼儿教育事业中的工作；两人的生平可由权威传记或经过平台审核的百科词条支撑。两人与西白菜园的居住关系仍须有可对应门牌的直接资料，未核到前不把任何院落默认说成名人故居。",
        taskDirection: "找出一个让你感到街巷尺度变化的转角、门洞或路面细节。",
        researchKeywords: ["西白菜园 历史风貌区", "西白菜园 谭道源", "西白菜园 陈鹤琴", "谭道源 北伐 生平", "陈鹤琴 幼儿教育 生平", "南京 西白菜园 历史建筑 保护"],
        reviewNote: "西白菜园已被纳入南京重要近现代建筑保护利用的片区线索；谭道源、陈鹤琴与本区的居住关系仍待直接资料核验。尊重居民生活，不进入院落或拍摄私密空间。",
      },
      {
        id: "tong-jun-residence-watergate-route",
        name: "童寯故居与童寯建筑馆",
        journeyRole: "anchor",
        purpose: "从童寯自宅进入相邻建筑馆，讨论建筑师如何把专业判断放进私人居所，又如何被保存为可阅读的建筑档案。",
        sourceIds: ["tong-jun-residence", "tong-jun-seu-opening", "tong-jun-seu-profile"],
        deepReadingFocus: "以童寯亲自设计的文昌巷52号自宅、建筑馆开放、建筑档案与《江南园林志》研究为主线，分清建筑事实与后来的阐释。可讲故居从私人住宅走向公众场馆，以及图纸、照片、旅行手账、设计手稿怎样让建筑师的工作被看见；家庭生活、师友情谊与私人轶事只在能追溯到馆方展签、家属回忆出版物或可靠研究时使用。",
        taskDirection: "从住宅外观或展签、图纸、模型中选一项，说出它如何解释“自宅也是作品”。",
        researchKeywords: ["童寯 文昌巷52号 自宅", "童寯建筑馆 东南大学 开放", "童寯 江南园林志 建筑档案"],
        reviewNote: "东南大学公开报道可确认故居与建筑馆于2026年1月对外开放、场馆实行预约分时参观；具体场次、当期展览和可拍摄范围须当天确认。用户提供的视频字幕文案只作二次核验线索，不替代正式来源。",
      },
      {
        id: "ipho-watergate-route",
        name: "iPHO 爱福越式食堂",
        journeyRole: "rest",
        purpose: "将午餐作为独立停留站：从一间当代餐厅恢复体力，也观察今天城市饮食如何嵌进旧城行程。",
        sourceIds: ["ipho-amap"],
        deepReadingFocus: "只依据店方或可靠饮食资料介绍菜品与用餐空间；无资料时以午餐节奏、休息和街区观察为主。",
        taskDirection: "从菜单、香气或用餐方式中记录一个让你意识到城市饮食多样性的细节。",
        reviewNote: "目前仅有地图级地点资料；营业、菜单、排队和座位须出发日前确认。",
      },
      {
        id: "puyue-bookstore-watergate-route",
        name: "朴阅书店",
        journeyRole: "ending",
        purpose: "用一间正在营业的当代书店收束：城市阅读不只在旧址里，也仍发生在今天可停留的空间。",
        sourceIds: ["puyue-amap-watergate-route"],
        deepReadingFocus: "优先补齐店方公开资料，再把上午的书店街记忆与当代实体书店的停留、选书和活动连接起来。可检索附近鲁迅读书处、海军部旧址、书店曾做的太平路文化展与“文学高速”系列活动；没有店方、场地方或权威资料时，不将这些关联写成确定事实。",
        taskDirection: "选一本最能回应今天路线的问题的书，并写下它连接了哪一站；也可向店员确认当天是否有与南京、太平路或文学活动相关的书架或活动。",
        researchKeywords: ["朴阅书店 鲁迅读书处", "朴阅书店 海军部旧址", "朴阅书店 太平路文化展", "朴阅书店 文学高速"],
        reviewNote: "当前只有地图级地点资料；鲁迅读书处、海军部旧址、太平路文化展与“文学高速”均是待店方或场地方材料核实的关联线索。店方活动、拍摄和团体停留规则须出发日前确认。",
      },
    ],
    sources: [
      {
        id: "water-west-gate-map",
        title: "水西门广场地点信息",
        publisher: "高德地图",
        url: "https://www.amap.com/place/B0FFFZS53M",
        kind: "map",
        checkedAt: latestCheckedAt,
      },
      {
        id: "three-mountain-gate-map",
        title: "三山门遗址碑地点信息",
        publisher: "高德地图",
        url: "https://www.amap.com/place/B0FFKWBWZ8",
        kind: "map",
        checkedAt: latestCheckedAt,
      },
      {
        id: "zhongnan-bank-official",
        title: "秦淮区各级文物保护单位资料",
        publisher: "南京市秦淮区人民政府",
        url: "https://www.njqh.gov.cn/qhqrmzf/qhqwhj/201810/t20181024_706961.html",
        kind: "official",
        checkedAt: latestCheckedAt,
      },
      {
        id: "saint-pauls-official",
        title: "圣保罗堂简介",
        publisher: "南京市民族宗教事务局",
        url: "https://mzzjj.nanjing.gov.cn/mzzj/njzjgk/njjdj/201809/t20180927_1198601.html",
        kind: "official",
        checkedAt: latestCheckedAt,
      },
      {
        id: "qinghechangji-official",
        title: "秦淮区区级文物保护单位及一般不可移动文物名录",
        publisher: "南京市文化和旅游局",
        url: "https://wlj.nanjing.gov.cn/zwgk/wwbhml/201912/P020191206605198017963.pdf",
        kind: "official",
        checkedAt: latestCheckedAt,
      },
      {
        id: "qinghechangji-cultural",
        title: "太平南路将成南京新地标，16处民国建筑将修复",
        publisher: "中国经济网（转引现代快报现场报道）",
        url: "https://district.ce.cn/newarea/roll/201405/07/t20140507_2775280.shtml",
        kind: "cultural",
        checkedAt: latestCheckedAt,
      },
      {
        id: "jiangsu-hotel-official",
        title: "南京市旅游星级饭店名录",
        publisher: "南京市文化和旅游局",
        url: "https://wlj.nanjing.gov.cn/zwfw/bszlxz/202408/P020240819358191896924.pdf",
        kind: "official",
        checkedAt: latestCheckedAt,
      },
      {
        id: "taiping-road-renewal-official",
        title: "太平南路恢复历史文化韵味",
        publisher: "南京市城乡建设委员会",
        url: "https://sjw.nanjing.gov.cn/njscxjswyh/201811/t20181121_1221830.html",
        kind: "official",
        checkedAt: latestCheckedAt,
      },
      {
        id: "taiping-shopping-mall-official",
        title: "秦淮区区级文物保护单位及一般不可移动文物名录中的太平商场条目",
        publisher: "南京市文化和旅游局",
        url: "https://wlj.nanjing.gov.cn/zwgk/wwbhml/201912/P020191206605198017963.pdf",
        kind: "official",
        checkedAt: latestCheckedAt,
      },
      {
        id: "taiping-shopping-mall-archives",
        title: "那些年，我们一起逛过的商场……",
        publisher: "南京市档案馆",
        url: "https://dag.nanjing.gov.cn/dawh/dags/202311/t20231128_4109897.html",
        kind: "authority",
        checkedAt: latestCheckedAt,
      },
      {
        id: "ancient-bookstore-official",
        title: "关于推动古籍书店复业的提案答复",
        publisher: "中共南京市委",
        url: "https://www.nanjing.gov.cn/xxgkn/jytabljggk/2023njytabl/shizxta/202311/t20231127_4107675.html",
        kind: "official",
        checkedAt: latestCheckedAt,
      },
      {
        id: "taiping-road-bookstreet-authority",
        title: "南京记忆｜漫话当年的“书店街”",
        publisher: "南京市地方志工作办公室",
        url: "https://dfz.nanjing.gov.cn/gzdt/202603/t20260311_5803686.html",
        kind: "authority",
        checkedAt: latestCheckedAt,
      },
      {
        id: "taiping-road-chronicle",
        title: "南京记忆：漫话太平南路的传说趣闻",
        publisher: "南京市地方志工作办公室",
        url: "https://dfz.nanjing.gov.cn/gzdt/202602/t20260210_5790900.html",
        kind: "authority",
        checkedAt: latestCheckedAt,
      },
      {
        id: "west-cabbage-garden-official",
        title: "秦淮老城单元相关历史风貌区资料",
        publisher: "南京市生态环境局",
        url: "https://sthjj.nanjing.gov.cn/ztzl/xzxkhxzzfxxgs/pcjxxgk/qh/xmhpslqk_68830/202407/P020240719627604719637.pdf",
        kind: "official",
        checkedAt: latestCheckedAt,
      },
      {
        id: "tong-jun-residence",
        title: "东南大学亚洲建筑档案中心分馆（童寯建筑馆）成立",
        publisher: "东南大学建筑学院",
        url: "https://arch.seu.edu.cn/2025/1210/c9118a548161/page.htm",
        kind: "official",
        checkedAt: latestCheckedAt,
      },
      {
        id: "tong-jun-seu-opening",
        title: "童寯建筑馆对外开放",
        publisher: "东南大学（转引现代快报报道）",
        url: "https://www.seu.edu.cn/2026/0117/c124a552910/page.htm",
        kind: "academic",
        checkedAt: latestCheckedAt,
      },
      {
        id: "tong-jun-seu-profile",
        title: "建筑大师：大隐隐于文昌巷",
        publisher: "东南大学",
        url: "https://www.seu.edu.cn/2009/0525/c124a49634/page.htm",
        kind: "academic",
        checkedAt: latestCheckedAt,
      },
      {
        id: "puyue-amap-watergate-route",
        title: "朴阅书店地点信息",
        publisher: "高德地图",
        url: "https://www.amap.com/place/B0IRF5AJXC",
        kind: "map",
        checkedAt: latestCheckedAt,
      },
      {
        id: "handmade-wonton-amap",
        title: "手巧馄饨（莫愁新村店）地点信息",
        publisher: "高德地图",
        url: "https://www.amap.com/place/B0FFFPAT52",
        kind: "map",
        checkedAt: latestCheckedAt,
      },
      {
        id: "ipho-amap",
        title: "iPHO 爱福越式食堂地点信息",
        publisher: "高德地图",
        url: "https://www.amap.com/place/B0JDML46EM",
        kind: "map",
        checkedAt: latestCheckedAt,
      },
    ],
    schedule: [
      { time: "07:00–08:00", title: "手巧馄饨（莫愁新村店）", detail: "早餐；从这里开始，不压缩为赶路时间。", kind: "用餐" },
      { time: "08:00–08:14", title: "步行至水西门广场", detail: "约 1.08 公里、14 分钟。", kind: "步行" },
      { time: "08:14–08:24", title: "水西门广场与三山门遗址碑", detail: "以水边、广场、遗址碑和说明牌建立旧城边界感。", kind: "参观" },
      { time: "08:24–08:27", title: "赏心亭", detail: "作为独立观察点；现场以可见标识和公共秩序为准。", kind: "参观" },
      { time: "08:27–08:47", title: "骑行至中南银行旧址", detail: "高德骑行约 4.22 公里、17 分钟；含取还车缓冲。", kind: "骑行" },
      { time: "08:47–08:57", title: "中南银行南京分行旧址（外观）", detail: "看转角入口、钟楼和原营业厅方向；不假定可入内。", kind: "参观" },
      { time: "08:57–09:00", title: "圣保罗堂外观", detail: "两处相距约 105 米；提前看外观并等候开门。", kind: "参观" },
      { time: "09:00–09:18", title: "圣保罗堂", detail: "按 09:00 开门的当日计划；礼拜或限制进入时改为外观观察。", kind: "参观" },
      { time: "09:18–09:24", title: "浙江庆和昌记支店旧址（外观）", detail: "只在公共街面观察，不进入住户或办公区域。", kind: "参观" },
      { time: "09:24–09:29", title: "江苏饭店及太平南路 305 号沿街建筑（外观）", detail: "以不同年代的商业街使用和立面为观察重点。", kind: "参观" },
      { time: "09:29–09:35", title: "太平商场（外观）", detail: "观察商场入口、立面与连续商业街的关系。", kind: "参观" },
      { time: "09:35–09:42", title: "古籍书店（外观）", detail: "当前不承诺入店或购书，从门头与书店街线索观察。", kind: "参观" },
      { time: "09:42–10:00", title: "西白菜园历史风貌区", detail: "转入居住街巷，预留集合、预约和开门缓冲。", kind: "步行" },
      { time: "10:00–11:30", title: "童寯故居与童寯建筑馆", detail: "按当天预约、展览和工作人员指引参观，并根据可拍摄范围调整停留。", kind: "参观" },
      { time: "11:30–13:00", title: "iPHO 爱福越式食堂", detail: "从童寯故居步行约 645 米、9 分钟后午餐。", kind: "用餐" },
      { time: "13:00–13:35", title: "打车至朴阅书店", detail: "不把约 7.6 公里的长距离伪装成顺路步行。", kind: "交通" },
      { time: "14:00–16:00", title: "朴阅书店", detail: "在老学堂创意园结束这一天的城市阅读，并留出完整的阅读与交流时间。", kind: "参观" },
    ],
    reviewFocus: [
      "确认水西门广场、赏心亭与三山门遗址碑的现场标识和可观察范围，不能用地图名称补足遗址事实。",
      "确认圣保罗堂 09:00 是否对散客开放、是否有礼拜与拍摄限制。",
      "确认童寯故居与建筑馆的预约、实际入场时间和临时展览安排。",
      "为手巧馄饨、iPHO、赏心亭和朴阅补齐店方或场地方资料；没有可靠资料时，深读只写实用信息和现场观察。",
      "核验江苏饭店与“原安乐酒店”的名称、沿革和建筑关系，未证实前不在导览中作确定断言。",
      "确认共享单车的取还点；无可用车辆时改打车，并复核 iPHO、朴阅的营业信息。",
    ],
  },
];

export function getCuratedRouteDraft(id: string | null | undefined) {
  return curatedRouteDrafts.find((draft) => draft.id === id) ?? null;
}
