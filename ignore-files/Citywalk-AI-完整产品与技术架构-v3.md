# Cultural Citywalk：主题增强型城市漫游产品与技术架构

> 文档版本：v3.0（开发准备版）  
> 面向范围：中国大陆城市为主，供本人及亲友使用  
> 产品定位：历史、文学、音乐、建筑与城市文化驱动的私人城市漫游助手  
> 核心原则：**地理优先，主题增强，AI 协作，事实可核验。**

---

## 1. 产品愿景

> **不是带你打卡一座城市，而是带你读懂一座城市。**

Cultural Citywalk 不是单纯的旅游攻略生成器，也不是要求用户围绕某个纯主题横跨整座城市的“主题打卡地图”。

它首先保证一条路线：

- 一天内走得完；
- 地理上顺路；
- 时间安排合理；
- 能兼顾预约、用餐和休息；
- 在中国大陆真实可导航。

在此基础上，再通过历史、文学、音乐、建筑、书店、城市变迁等主题，为路线补充关联、解释和故事。

产品提供三种 AI 参与方式：

1. **发现 Discover**：用户几乎没有目标，AI 完整规划；
2. **完善 Complete**：用户已有部分必去点，AI 补全路线；
3. **优化 Refine**：用户已有一条路线，AI 帮助调整和增强。

主题不一定是路线的唯一骨架，更适合作为一层可调节的“主题滤镜”。

---

## 2. 产品核心原则

### 2.1 地理优先

路线的第一要求不是主题纯度，而是可执行性。

系统优先处理：

- 起点和终点；
- 必须到达的地点；
- 固定预约时间；
- 路网距离；
- 步行强度；
- 用餐与休息；
- 最晚结束时间；
- 当天开放情况。

主题相关性不能凌驾于路线可走性之上。

### 2.2 主题增强

主题用于帮助用户理解地点，而不是强迫地点迁就主题。

例如一条“武康路周边漫游”，可以同时拥有：

- 历史滤镜；
- 文学滤镜；
- 建筑滤镜；
- 音乐滤镜；
- 书店滤镜。

切换主题后，底层路线不必完全重做，而是可以：

- 调整少量候选站点；
- 改变讲解角度；
- 补充不同的人物、作品和时代背景；
- 推荐不同的书目、音乐或观察任务。

### 2.3 AI 协作，而非 AI 独断

AI 可以帮助用户决定，但不替用户夺走控制权。

AI 应做到：

- 解释为什么这样安排；
- 告诉用户增加某站会多走多久；
- 明确哪些是必去点、推荐点和可删点；
- 给出可替换方案；
- 在约束冲突时说明取舍；
- 允许用户随时修改和重新计算。

### 2.4 事实可核验

地图、营业信息、预约状态和历史内容必须区分来源。

- 地图服务负责地点、坐标、路径和交通耗时；
- 官方页面或可信来源负责开放、预约和历史事实；
- AI 负责组织、归纳、关联和表达；
- 用户可以确认、纠正或覆盖信息。

---

## 3. 三种探索模式

## 3.1 发现模式 Discover

### 用户状态

> 我什么都没想好，帮我安排。

### 典型输入

- 城市；
- 日期和可用时长；
- 大致区域，或允许 AI 推荐区域；
- 兴趣偏好；
- 体力和交通偏好；
- 预算；
- 是否需要安排餐厅。

### AI 负责

- 推荐适合一天或半天漫游的区域；
- 提出 2～3 个路线方向；
- 选择核心站点；
- 安排用餐和休息；
- 搜索沿途候选点；
- 生成可执行时间轴；
- 添加主题讲解。

### 输出方式

建议先给用户一个简短选择，而不是直接生成唯一答案：

```text
南京 · 一日漫游

方案 A：民国建筑与城市生活
方案 B：书店、文学与老街
方案 C：博物馆与城墙遗迹
```

用户选择后再生成完整路线。

---

## 3.2 完善模式 Complete

### 用户状态

> 我已经有几个一定想去的地方，剩下交给 AI。

这是预计使用频率最高的模式。

### 典型输入

```text
必去：
- 上海图书馆东馆
- 思南书局
- 上海音乐厅

希望：
- 偏文学和音乐
- 步行不超过 10 公里
- 中间安排午餐
```

### 系统流程

1. 确认所有必去地点的高德 POI；
2. 识别固定时间和预约；
3. 计算必去点之间的真实路网；
4. 判断路线是否跨区或不可在一天内完成；
5. 沿路线走廊搜索候选地点；
6. 计算每个候选点的绕行成本；
7. AI 根据兴趣、时间和主题排序；
8. 用户选择加入哪些候选点；
9. 重新计算完整时间轴；
10. 生成简短讲解和实用提示。

### 重要交互

候选点不能静默加入。

每个建议都应该展示：

- 推荐理由；
- 增加的步行或交通时间；
- 建议停留时长；
- 是否影响后续预约；
- 营业和预约状态；
- 与主题的关联程度。

---

## 3.3 优化模式 Refine

### 用户状态

> 我已经有路线，请帮我调整。

### 输入来源

- 用户手动创建；
- 已保存路线；
- 朋友分享的路线；
- 由发现或完善模式生成的路线；
- 后续可考虑导入高德收藏或文本清单。

### AI 可执行的优化

- 调整站点顺序；
- 减少步行；
- 替换过远地点；
- 增加或删除餐厅；
- 增加休息；
- 加入书店、展览或历史建筑；
- 改为雨天路线；
- 改为长辈友好路线；
- 围绕某个主题增强；
- 缩短为半日版；
- 延长为一日版；
- 处理临时闭馆或取消预约。

### 修改原则

AI 必须给出变更摘要：

```text
本次调整：
- 删除 1 个跨区景点
- 增加 1 个顺路书店
- 午餐提前 30 分钟
- 总步行从 12.4 km 降至 8.7 km
- 预计结束时间提前 45 分钟
```

用户确认后再覆盖原路线，或另存为新版本。

---

## 4. 主题系统

主题系统不应只有“整条纯主题路线”一种形式，而应支持三种强度。

### 4.1 轻主题

底层路线基本不变，只改变讲解角度。

例如：

- 为普通历史街区增加文学人物关联；
- 为建筑路线增加音乐作品推荐；
- 为书店路线增加出版史内容。

### 4.2 中主题

保留大部分底层路线，但替换或加入 1～3 个主题相关站点。

例如：

- 在武康路路线中加入作家故居；
- 在城市历史路线中加入老唱片店；
- 在博物馆路线中加入主题书店。

### 4.3 强主题

主题本身成为路线主要约束。

适合：

- 书店巡礼；
- 工业遗产；
- 民国建筑；
- 城墙遗迹；
- 音乐厅与唱片店；
- 某个紧凑区域内的作家足迹。

系统应在主题地点过于分散时提醒：

> 这些地点横跨三个城区，不适合步行一日游。建议拆为两条路线，或改用“轻主题增强”。

---

## 5. 主题分类

### 5.1 历史

- 城市变迁；
- 开埠史；
- 民国史；
- 战争史；
- 工业遗产；
- 城墙与城门；
- 租界与街区史；
- 商业与生活史。

### 5.2 文学

- 作家与故居；
- 小说中的城市；
- 文学社团；
- 出版与报刊；
- 书店与图书馆；
- 城市文学地标；
- 某个时代的文学生活。

### 5.3 音乐

- 音乐厅；
- 音乐学院；
- 唱片店；
- 乐器店；
- 音乐家故居；
- 戏院与演出史；
- 与区域或时代对应的聆听列表。

### 5.4 建筑

- Art Deco；
- 近代建筑；
- 民国建筑；
- 工业建筑；
- 古典建筑；
- 宗教建筑；
- 当代建筑；
- 城市更新与再利用。

### 5.5 文化与生活

- 书店巡礼；
- 博物馆与展览；
- 茶馆与咖啡馆；
- 旧书与唱片；
- 菜市场与市井生活；
- 手工艺；
- 戏曲与剧场；
- 摄影与城市观察。

### 5.6 城市时间切片

以“区域 + 年代”为主题：

- 上海 1935；
- 北京 1919；
- 南京 1912；
- 广州 1840。

每个站点展示：

- 当年这里是什么；
- 当时发生过什么；
- 后来如何变化；
- 今天还能看到什么；
- 哪些内容存在争议或待核实。

---

## 6. 沿途智能补点

沿途智能补点是 MVP 核心能力之一。

### 6.1 基本思想

> 地图负责发现候选地点，程序负责计算顺路程度，AI 负责筛选和解释。

不能让 AI 凭空回答“附近有什么”。

### 6.2 候选点来源

通过高德 POI 搜索获得：

- 景点；
- 博物馆；
- 历史建筑；
- 书店；
- 图书馆；
- 咖啡馆；
- 餐厅；
- 公园；
- 商场与休息点；
- 剧场与音乐空间。

### 6.3 路线走廊

不只做“某一点周边搜索”，而是围绕路线折线建立走廊：

```text
路线折线
  ↓
按步行模式建立约 300～800 米候选走廊
  ↓
搜索或筛选走廊内 POI
```

走廊宽度可根据：

- 城市密度；
- 步行强度；
- 交通方式；
- 可用时间；
- 用户设置的最大绕行时间

动态调整。

### 6.4 绕行成本

对锚点 A、锚点 B 和候选点 C：

```text
绕行时间 =
A → C 的真实耗时
+ C → B 的真实耗时
- A → B 的真实耗时
```

建议分类：

- 非常顺路：增加不超过 5 分钟；
- 推荐：增加不超过 10 分钟；
- 可考虑：增加不超过 15 分钟；
- 专程前往：超过 15 分钟，仅在高度匹配时展示。

阈值应该允许用户调整。

### 6.5 候选点评分

```text
candidateScore =
  routeFit
  + interestFit
  + themeFit
  + timeWindowFit
  + diversityBonus
  + sourceConfidence
  - detourPenalty
  - scheduleRisk
  - duplicatePenalty
```

MVP 可先使用规则加权，不需要复杂机器学习。

### 6.6 候选点状态

- 系统推荐；
- 用户已加入；
- 用户忽略；
- 因时间不足隐藏；
- 因闭馆隐藏；
- 因重复隐藏；
- 备用点；
- 雨天替代点。

---

## 7. 路线生成与校验引擎

### 7.1 总流程

```text
用户选择探索模式
  ↓
收集城市、日期、时间和偏好
  ↓
地点联想与 POI 确认
  ↓
确定必去点、时间锚点和可选点
  ↓
地图计算真实路网
  ↓
沿途候选点搜索
  ↓
规则引擎计算绕行成本和约束
  ↓
AI 生成或优化路线方案
  ↓
程序生成完整时间轴
  ↓
硬约束校验
  ↓
AI 生成主题讲解和推荐理由
  ↓
用户确认、保存或继续调整
```

### 7.2 硬约束

程序必须校验：

- 必去点是否全部包含；
- 固定预约是否准时；
- 是否超过最晚结束时间；
- 起点和终点是否正确；
- 全天步行是否超限；
- 连续步行是否超限；
- 是否存在不可达或明显绕行；
- 用餐时间是否合理；
- 是否有场馆闭馆冲突；
- 是否有重复 POI；
- 是否预留交通与排队缓冲；
- 是否存在高风险的临界换乘；
- 地图结果是否为真实值还是估算值。

### 7.3 软约束

AI 和评分系统综合考虑：

- 主题连贯性；
- 兴趣匹配；
- 站点类型多样性；
- 室内外平衡；
- 景点与休息节奏；
- 餐饮偏好；
- 预算；
- 拍照或阅读时间；
- 同行人的年龄和体力。

### 7.4 约束冲突处理

当无法同时满足所有要求时，系统不要静默失败。

例如：

```text
你选择的 5 个必去点横跨 3 个城区。
在 9:30～18:00 内全部完成，预计需要：
- 交通 3 小时 20 分钟
- 步行 13.8 公里

建议：
A. 保留全部地点，改为交通优先
B. 删除最远的 1 个地点
C. 拆为两天
```

---

## 8. AI 职责与生成策略

### 8.1 AI 负责

- 理解自然语言需求；
- 补齐缺失偏好；
- 提出区域或路线方案；
- 对候选点排序；
- 生成推荐理由；
- 给路线命名；
- 生成摘要；
- 串联站点故事；
- 生成历史、文学、音乐和建筑讲解；
- 解释路线修改；
- 生成不同主题滤镜下的内容；
- 将长路线缩短或拆分。

### 8.2 AI 不直接负责

- 经纬度；
- POI 是否真实存在；
- 实际路网耗时；
- 营业时间；
- 门票；
- 预约政策；
- 临时闭馆；
- 官方联系方式；
- 无来源的历史事实；
- 参考资料 URL。

### 8.3 分阶段生成

不要一次生成完整路线、所有故事、全部事实和引用。

#### 阶段 A：意图结构化

将用户自然语言解析为：

```json
{
  "mode": "complete",
  "city": "上海",
  "date": "2026-08-12",
  "mustVisitPlaceIds": [],
  "themeFilters": ["literature", "music"],
  "pace": "normal",
  "maxWalkingKm": 10,
  "mealRequirement": "lunch"
}
```

#### 阶段 B：路线方案

AI 只能在系统提供的真实 POI ID 和路网数据中选择：

```json
{
  "title": "书页与乐声之间",
  "orderedPlaceIds": ["p1", "p4", "p2"],
  "candidatePlaceIds": ["p8", "p9"],
  "stayMinutes": {
    "p1": 50,
    "p4": 35,
    "p2": 70
  },
  "reasoningSummary": "路线由西向东推进，避免折返。",
  "warnings": []
}
```

#### 阶段 C：规则校验

程序计算时间轴并校验硬约束。

#### 阶段 D：主题内容

按站点生成短内容：

```json
{
  "shortIntro": "80～150 字",
  "themeConnections": [
    {
      "theme": "literature",
      "text": "..."
    }
  ],
  "practicalTips": [],
  "sourceClaims": []
}
```

#### 阶段 E：按需深读

用户点击“展开故事”后，再生成：

- 历史背景；
- 作家或音乐家关联；
- 延伸阅读；
- 推荐聆听；
- 时间切片；
- 资料来源。

---

## 9. 页面与交互架构

## 9.1 首页

主标题：

> 细读一座城

三个入口：

### AI 帮我发现

我只有城市和时间，剩下交给 AI。

### 我已有几个目标

输入必去点，让 AI 补全。

### 我已有路线

导入或打开路线，让 AI 优化。

首页还可以展示：

- 最近路线；
- 亲友分享；
- 精选区域路线；
- 推荐路线入口；
- 历史、文学、音乐和书店主题入口；
- 最近走过的城市。

---

## 9.2 生成对话与表单

不建议只用长表单，也不建议完全依赖自由聊天。

采用“对话 + 可视化表单”的混合模式：

- AI 用自然语言提问；
- 右侧或底部同步显示结构化摘要；
- 用户随时直接修改城市、时间、地点和偏好；
- AI 不重复询问已经填写的内容；
- 生成前展示最终约束摘要。

### 必填最小集

- 城市；
- 日期或“暂不确定”；
- 可用时长；
- 起点；
- 终点或终点策略；
- 必去点；
- 步行强度。

### 可选偏好

- 历史、文学、音乐、建筑等主题；
- 餐饮；
- 预算；
- 长辈儿童；
- 无障碍；
- 室内外；
- 最大绕行时间；
- 是否接受打车。

---

## 9.3 路线结果页

顶部展示：

- 标题；
- 日期与总时长；
- 总步行和交通；
- 主题滤镜；
- 是否存在风险；
- 地图与时间轴切换。

每个站点卡片展示：

- 预计到达；
- 停留时间；
- 地点名称；
- 下一段交通；
- 简短介绍；
- 主题标签；
- 开放与预约状态；
- 个人备注；
- 查看故事；
- 替换；
- 删除；
- 周边可选点。

---

## 9.4 沿途可选点面板

每两个站点之间显示：

```text
从思南书局到上海音乐厅

非常顺路
- 某历史建筑：增加 4 分钟
- 某独立书店：增加 6 分钟

可考虑
- 某唱片店：增加 13 分钟
```

支持：

- 加入路线；
- 设为备用；
- 不再推荐同类地点；
- 查看为什么推荐；
- 查看对后续时间的影响。

---

## 9.5 主题滤镜

主题滤镜可用于：

- 当前路线；
- 某个站点；
- 沿途候选点；
- 讲解内容。

例如：

```text
历史  ●
文学  ●
音乐  ○
建筑  ●
书店  ○
```

切换滤镜时分两种动作：

- “只改变讲解”：不改路线；
- “同时优化站点”：允许替换少量地点。

---

## 9.6 路线编辑与版本

MVP 编辑能力：

- 修改标题；
- 增删站点；
- 拖拽排序；
- 改停留时间；
- 改交通方式；
- 改主题强度；
- 改个人备注；
- 单站重新生成；
- 重新计算时间；
- 另存为新版本；
- 恢复上一个快照。

不做复杂富文本 CMS。

---

---

## 10. 本版修订摘要（v3.0）

在 v2.0 基础上，本版重点完成以下调整：

1. 明确 **GitHub Pages + Next.js 静态导出**条件下的路由实现，避免使用无法在运行时新增的动态静态页；
2. 将 **PostGIS 从首阶段必需项调整为增强项**，先用高德路线与采样点搜索验证核心价值；
3. 补充 **高德 GCJ-02 与数据库空间坐标的转换边界**，避免地图标记发生偏移；
4. 将生成流程拆为“同步 MVP”和“异步增强”两套方案，避免一开始就搭建复杂队列；
5. 明确 `generation_jobs` 只是状态记录，不等于后台任务执行器；
6. 增加 API 代理、RLS、速率限制、额度和幂等策略；
7. 增加可观测性、测试、错误降级、隐私和数据删除要求；
8. 收紧第一版范围，以“完善模式”作为首个真正可用闭环；
9. 将桌面端规划与手机端途中使用纳入同一响应式产品，而不是分别开发两个应用；
10. 给出 GitHub Pages 阶段的迁移边界，避免未来迁移国内部署时重写业务层。

---

## 11. MVP 产品边界

### 11.1 第一版核心闭环

第一版只验证一个问题：

> 用户给出几个必去地点后，系统能否生成一条真实顺路、时间合理，并且有文化内容的路线？

完整闭环：

1. 选择“我已有几个目标”；
2. 输入城市、日期、起点、终点和 2～4 个必去地点；
3. 通过高德输入提示确认真实 POI；
4. 获取必去点之间的路线与耗时；
5. 搜索沿途候选地点；
6. 计算候选点的绕行成本；
7. AI 推荐 3～6 个可选点并说明理由；
8. 用户加入、忽略或设为备用；
9. 系统重新计算完整时间轴；
10. 为路线增加“历史”或“文学”轻主题讲解；
11. 保存为本地草稿；
12. 登录后保存到 Supabase，并生成只读分享链接。

### 11.2 第一版暂不做

- AI 自动选择整座城市的最佳区域；
- 多人实时协作；
- 公共社区、评论和关注；
- 完整照片游记；
- 自动抓取全网历史资料；
- 音乐自动播放；
- 全城 POI 数据库；
- 复杂推荐算法；
- OR-Tools 路线优化；
- 站点级富文本编辑器；
- 全自动异步任务队列；
- 动态社交分享预览；
- 站内支付和会员系统。

### 11.3 第一版主题范围

只做：

- 历史；
- 文学。

建筑可以作为历史内容的子标签，书店作为地点类型。

音乐、城市时间切片、推荐阅读和聆听列表放在路线内核稳定以后。

---

## 12. 技术栈与部署决策

### 12.1 MVP 技术栈

#### 前端

- Next.js App Router；
- React；
- TypeScript；
- Tailwind CSS；
- react-hook-form；
- Zod；
- TanStack Query；
- Zustand；
- dnd-kit；
- 高德 JavaScript API 2.0。

#### 后端

- Supabase Auth；
- Supabase PostgreSQL；
- Supabase Storage；
- Supabase Edge Functions；
- Supabase RLS；
- DeepSeek API；
- 高德 Web 服务 API。

#### 部署

- GitHub Actions 构建；
- Next.js `output: "export"`；
- GitHub Pages；
- 自定义域名和 HTTPS（可选）。

### 12.2 暂缓引入

以下能力不是第一阶段的前置条件：

- PostGIS；
- Supabase Queues / pgmq；
- 独立 Node.js 或 Python 后端；
- Redis；
- 向量数据库；
- OR-Tools；
- 微服务；
- 国内云双部署。

它们应在真实使用数据证明必要后再加入。

---

## 13. GitHub Pages 与路由设计

### 13.1 关键限制

GitHub Pages 只能托管构建时生成的静态文件。

因此，以下写法不适合作为 MVP 的运行时路线：

```text
/route/[id]
/share/[code]
```

因为新生成的路线 ID 和分享码在构建时并不存在，无法为每个 ID 预先生成 HTML。

### 13.2 MVP 推荐路由

使用固定静态页面 + 查询参数：

```text
/create/complete/
/route/?id=<route-id>
/share/?code=<share-code>
/library/
```

或者使用 hash：

```text
/route/#/<route-id>
```

优先推荐查询参数，调试和迁移更直观。

### 13.3 封装要求

业务组件禁止直接拼 URL。

统一提供：

```ts
routeUrl(routeId: string): string
shareUrl(code: string): string
readRouteId(searchParams: URLSearchParams): string | null
```

未来迁移到支持服务端路由的平台后，只修改 URL 适配层。

### 13.4 静态导出下的页面原则

- 页面本身是静态壳；
- 登录状态和路线数据由客户端加载；
- 不使用依赖 `cookies()`、`headers()` 的服务端运行时逻辑；
- API 全部通过 Supabase Edge Functions；
- 路线分享页首屏需要 loading/skeleton；
- 暂不支持每条路线独立的动态 Open Graph 图片和 metadata。

---

## 14. 前端应用架构

### 14.1 状态职责

#### TanStack Query

负责服务器状态：

- 当前路线；
- POI 搜索；
- 路线计算；
- 候选地点；
- 生成任务；
- 分享读取；
- 主题内容。

#### Zustand

负责本地交互状态：

- 当前路线编辑草稿；
- 未提交的站点排序；
- 地图展开状态；
- 阅读 / 导航模式；
- 候选点选择；
- 路线生成步骤。

#### react-hook-form

负责：

- 城市和日期；
- 起终点；
- 必去点；
- 步行强度；
- 主题偏好；
- 餐饮要求。

#### localStorage

只保存：

- 未登录草稿；
- 最近一次编辑快照；
- 少量 UI 偏好。

不要将 localStorage 作为云端数据的长期镜像。

### 14.2 Repository 层

组件不直接调用 Supabase 或 localStorage。

```ts
interface RouteRepository {
  get(id: string): Promise<Route>;
  save(route: RouteDraft): Promise<Route>;
  createSnapshot(routeId: string): Promise<void>;
}

interface DraftRepository {
  getLocalDraft(): RouteDraft | null;
  saveLocalDraft(draft: RouteDraft): void;
  clearLocalDraft(): void;
}
```

### 14.3 响应式策略

只维护一个 Web 应用：

- 桌面端：用于规划、比较、编辑和深度阅读；
- 手机端：用于查看下一站、导航、打卡和临时调整。

不要维护桌面版与手机版两套业务代码。

---

## 15. 地图与坐标系统

### 15.1 坐标边界

高德地图使用高德坐标体系（GCJ-02）。

数据库必须明确记录坐标来源：

```ts
type CoordinateSystem = "gcj02" | "wgs84";

type Coordinate = {
  lng: number;
  lat: number;
  system: CoordinateSystem;
};
```

### 15.2 MVP 建议

在 MVP 中：

- 高德 POI、地图显示和路线规划统一使用 GCJ-02；
- `places` 表保存原始高德坐标；
- 字段明确命名为 `amap_lng`、`amap_lat`，或增加 `coordinate_system`；
- 不要直接把高德坐标标记为未经说明的 WGS84 `SRID 4326` 数据；
- 只有在引入 PostGIS 空间查询时，才建立明确的转换与校验流程。

### 15.3 PostGIS 引入时的要求

PostGIS 的 `geography(POINT, 4326)` 通常按 WGS84 语义使用。

因此后续启用 PostGIS 时，必须二选一：

1. 将高德坐标转换为 WGS84 后写入空间列，同时保留原始 GCJ-02；
2. 仅将 PostGIS 用于近似空间筛选，并明确空间误差，不把结果直接作为地图绘制坐标。

推荐双字段：

```sql
amap_location JSONB NOT NULL,
wgs84_location GEOGRAPHY(POINT, 4326),
coordinate_converted_at TIMESTAMPTZ
```

地图绘制仍使用高德坐标，空间分析使用转换后的 WGS84。

---

## 16. 地点、路线和候选点策略

### 16.1 地点解析

所有用户输入地点必须经过确认：

```text
用户输入
  ↓
高德输入提示
  ↓
用户选择具体 POI
  ↓
保存高德 POI ID、名称、地址、城市、行政区和坐标
```

允许用户创建手工地点：

- 酒店；
- 朋友家；
- 某个路口；
- 临时集合点。

手工地点必须标记：

```text
source = manual
verification_status = user-confirmed
```

### 16.2 MVP 路线计算

第一版按以下顺序处理：

1. 用户必去点作为锚点；
2. 对少量锚点进行必要点对路线计算；
3. 先使用简单启发式排序：
   - 固定时间优先；
   - 减少明显折返；
   - 起终点约束；
4. AI 只在真实候选顺序中建议；
5. 程序计算最终时间轴并校验。

### 16.3 沿途候选点搜索

MVP 不必先构建 PostGIS 路线走廊。

可采用：

1. 从高德路线折线按距离采样；
2. 每隔约 500～1000 米取一个采样点；
3. 对采样点做有限半径的周边 POI 搜索；
4. 按 POI ID 去重；
5. 规则过滤类型、营业风险和重复地点；
6. 仅对 Top N 候选计算真实绕行时间；
7. AI 在 Top N 中排序和解释。

### 16.4 绕行计算

```text
绕行时间 =
A → C
+ C → B
- A → B
```

展示时同时说明：

- 新增交通时间；
- 建议停留时间；
- 对结束时间的影响；
- 是否影响固定预约；
- 信息可信度。

---

## 17. AI 生成架构

### 17.1 分步生成

AI 调用拆为：

1. `parse-intent`：自然语言转结构化约束；
2. `rank-candidates`：对真实候选 POI 排序；
3. `compose-route`：生成标题、摘要和推荐理由；
4. `generate-stop-intro`：生成站点短介绍；
5. `generate-deep-reading`：按需生成深读内容。

### 17.2 结构化输出

所有 AI 输出必须：

- 使用 JSON 模式；
- 使用 Zod 校验；
- 不接受模型生成的新 POI ID；
- 不接受模型生成的经纬度；
- 不接受模型生成的营业时间作为已验证事实；
- 校验失败时允许一次修复重试；
- 第二次失败后返回可理解的降级结果。

### 17.3 内容标识

界面区分：

```text
已核验事实
来源待确认
AI 讲解
编辑推荐
用户备注
```

### 17.4 Prompt 版本

保存：

- `model_name`
- `prompt_version`
- `input_hash`
- `generated_at`
- `token_usage`
- `latency_ms`

用于后续比较质量和费用。

---

## 18. 同步 MVP 与异步任务

### 18.1 MVP：前端编排的短步骤

第一版不必立刻建设完整队列。

推荐流程：

```text
前端创建草稿路线
  ↓
依次请求多个短 Edge Function
  ↓
每一步保存结果
  ↓
前端展示进度
  ↓
失败时只重试当前步骤
```

每一步应：

- 有幂等键；
- 有明确超时；
- 保存中间结果；
- 可单独重试；
- 不依赖一次长连接完成全部生成。

### 18.2 `generation_jobs` 的真实含义

`generation_jobs` 只能记录任务状态，不能自行执行任务。

MVP 中它可以作为：

- 前端步骤进度记录；
- 错误记录；
- 幂等与重试依据；
- 费用统计依据。

### 18.3 何时引入队列

出现以下任一情况时，再引入 Supabase Queues / pgmq：

- 用户关闭页面后仍需继续生成；
- 单次生成步骤明显超过请求适合时长；
- 同时生成请求开始排队；
- 需要自动重试和死信处理；
- 需要后台批量生成主题内容。

异步版需要明确的消费者：

```text
Queue
  ↓
Worker / Edge Function consumer
  ↓
处理消息
  ↓
更新 generation_jobs
  ↓
确认或重试消息
```

不要只创建队列表而没有消费者。

---

## 19. 推荐数据模型

### 19.1 核心表

第一版：

```text
profiles
places
routes
route_stops
route_constraints
route_candidates
route_snapshots
route_shares
generation_jobs
theme_annotations
content_sources
```

后续：

```text
route_members
check_ins
media_assets
user_usage
billing_events
```

### 19.2 `places`

建议字段：

```sql
id UUID PRIMARY KEY,
source TEXT NOT NULL,
source_place_id TEXT,
name TEXT NOT NULL,
address TEXT,
city TEXT NOT NULL,
district TEXT,
adcode TEXT,
amap_lng NUMERIC,
amap_lat NUMERIC,
coordinate_system TEXT NOT NULL DEFAULT 'gcj02',
poi_type TEXT,
verification_status TEXT NOT NULL,
raw_provider_data JSONB,
created_at TIMESTAMPTZ,
updated_at TIMESTAMPTZ
```

为 `(source, source_place_id)` 添加唯一索引。

### 19.3 `routes`

建议字段：

```sql
id UUID PRIMARY KEY,
owner_id UUID,
explore_mode TEXT NOT NULL,
title TEXT NOT NULL,
city TEXT NOT NULL,
route_date DATE,
start_time TIME,
end_time TIME,
status TEXT NOT NULL,
visibility TEXT NOT NULL,
theme_filters JSONB NOT NULL DEFAULT '[]',
preferences JSONB NOT NULL DEFAULT '{}',
generation_summary JSONB,
version INTEGER NOT NULL DEFAULT 1,
created_at TIMESTAMPTZ,
updated_at TIMESTAMPTZ
```

### 19.4 `route_stops`

必须结构化保存：

- 排序；
- 到达时间；
- 停留时间；
- 地点；
- 约束类型；
- 来源类型。

AI 文案可放 JSONB，但不要把整条路线只保存为一个大 JSON。

### 19.5 `route_candidates`

保存：

- 所属路线段；
- 绕行时间；
- 推荐停留；
- 评分；
- 推荐理由；
- 风险；
- 用户处理状态；
- 计算版本。

### 19.6 `theme_annotations`

同一地点可拥有多个主题注释。

增加唯一约束建议：

```text
(place_id, theme, prompt_version, locale)
```

---

## 20. RLS、API 与安全

### 20.1 前端可公开的密钥

前端只允许使用：

- Supabase publishable/anon key；
- 高德 JS API 浏览器 Key（按高德要求配置域名白名单）。

不得暴露：

- Supabase secret/service role key；
- DeepSeek API Key；
- 高德 Web 服务 Key；
- 分享签名密钥。

### 20.2 RLS

所有暴露给 Data API 的业务表都必须启用 RLS。

基础规则：

- 用户只能读写自己的私有路线；
- Editor 只能编辑被授权路线；
- Viewer 只能读取；
- 匿名用户不能直接查询 `routes`；
- 分享读取通过 Edge Function 返回裁剪字段；
- service role 只在 Edge Function 服务端使用。

### 20.3 Edge Function 保护

每个函数至少具备：

- CORS 白名单；
- JWT 校验；
- 输入 Zod 校验；
- 用户速率限制；
- 单用户每日调用额度；
- 幂等键；
- 超时；
- 结构化日志；
- 隐去密钥和敏感输入；
- 上游 API 错误映射。

### 20.4 分享链接

- 使用 10～16 位安全随机码；
- 可过期；
- 可撤销；
- 默认只读；
- 可选“允许复制”；
- 不返回 owner 邮箱等个人信息；
- 匿名访问限流；
- 支持 route version，防止缓存读到错误版本。

---

## 21. 失败降级

### 21.1 高德失败

- 保留用户输入地点；
- 显示“暂时无法计算真实路线”；
- 不展示伪造的精确耗时；
- 允许稍后重试；
- 已缓存 POI 可继续使用。

### 21.2 AI 失败

- 地图路线仍可正常使用；
- 使用规则排序生成基础路线；
- 推荐理由降级为模板；
- 主题讲解标记为待生成；
- 不阻塞用户保存路线。

### 21.3 Supabase 失败

- 未登录草稿保存在本地；
- 明确提示云端未保存；
- 恢复后允许手动同步；
- 避免“看似已保存、实际丢失”。

### 21.4 信息不确定

操作性信息显示状态：

```text
已核验
用户确认
来源待确认
可能已过期
```

不得用 AI 语气掩盖不确定性。

---

## 22. 可观测性与费用

### 22.1 日志

记录：

- request_id；
- user_id（内部 ID，不记录邮箱）；
- function_name；
- route_id；
- provider；
- latency；
- status；
- error_code；
- token_usage；
- provider_cost；
- cache_hit。

### 22.2 核心产品指标

第一阶段只跟踪：

- 开始规划人数；
- 完成 POI 确认比例；
- 成功生成路线比例；
- 候选点加入率；
- 路线编辑率；
- 分享率；
- 实际打开路线第二次的比例；
- 单条路线平均地图与 AI 成本。

### 22.3 预算保护

- 单用户每日生成次数；
- 单路线候选点上限；
- 单次 AI 输出 token 上限；
- 单站深读按需触发；
- 相同地点内容缓存；
- 异常高频调用自动阻断；
- 设置全项目每日费用报警线。

---

## 23. 测试策略

### 23.1 单元测试

重点测试纯函数：

- 时间轴计算；
- 绕行成本；
- 候选点评分；
- 固定时间冲突；
- 起终点约束；
- URL 生成与解析；
- AI 输出 Schema；
- 权限判定。

### 23.2 集成测试

- 高德代理与错误映射；
- DeepSeek JSON 输出；
- Supabase RLS；
- 分享码读取；
- 本地草稿迁移到账号；
- Edge Function 幂等。

外部 API 使用录制响应或 mock，避免测试持续消耗额度。

### 23.3 端到端测试

至少覆盖：

1. 未登录创建本地路线；
2. 登录后保存；
3. 添加候选点并重算；
4. 分享路线；
5. 手机端打开分享路线；
6. AI 失败后的基础路线降级；
7. 固定预约冲突提示。

### 23.4 人工路线样本

建立 10～20 条固定测试路线：

- 上海武康路；
- 南京总统府周边；
- 北京鼓楼；
- 广州沙面；
- 成都少城；
- 杭州湖滨等。

每次修改算法后对比：

- 总距离；
- 折返；
- 时间冲突；
- 候选点质量；
- 主题内容可信度。

---

## 24. 隐私与用户数据

### 24.1 数据最小化

不要默认收集：

- 精确实时位置轨迹；
- 通讯录；
- 持续后台定位；
- 与路线无关的个人信息。

起点如果是私人住宅，分享时支持：

- 隐藏精确地址；
- 替换为附近公共地点；
- 仅显示模糊区域。

### 24.2 用户控制

支持：

- 删除路线；
- 撤销分享；
- 删除账号；
- 导出路线；
- 清除本地草稿；
- 删除上传图片。

### 24.3 定位权限

只有用户主动进入导航模式时请求定位。

说明：

- 用途；
- 保存时间；
- 是否上传服务端。

MVP 建议定位仅在浏览器端使用，不持续写入数据库。

---

## 25. 推荐代码目录

```text
src/
├─ app/
│  ├─ page.tsx
│  ├─ create/
│  │  ├─ discover/page.tsx
│  │  ├─ complete/page.tsx
│  │  └─ refine/page.tsx
│  ├─ route/page.tsx
│  ├─ share/page.tsx
│  └─ library/page.tsx
├─ features/
│  ├─ places/
│  ├─ routing/
│  ├─ candidates/
│  ├─ planning/
│  ├─ themes/
│  ├─ routes/
│  ├─ sharing/
│  └─ generation/
├─ components/
│  ├─ map/
│  ├─ timeline/
│  ├─ route-editor/
│  ├─ candidate-panel/
│  ├─ theme-filters/
│  └─ city-reader/
├─ lib/
│  ├─ supabase/
│  ├─ amap/
│  ├─ ai/
│  ├─ validation/
│  ├─ repositories/
│  ├─ telemetry/
│  └─ urls/
├─ stores/
│  ├─ route-draft-store.ts
│  └─ ui-store.ts
└─ types/
   ├─ route.ts
   ├─ place.ts
   ├─ candidate.ts
   ├─ theme.ts
   └─ generation.ts

supabase/
├─ functions/
│  ├─ place-search/
│  ├─ route-plan/
│  ├─ route-candidates/
│  ├─ ai-parse-intent/
│  ├─ ai-rank-candidates/
│  ├─ ai-generate-intro/
│  ├─ route-share/
│  └─ route-sync/
├─ migrations/
├─ seed.sql
└─ tests/
```

MVP 中不必为了“模块纯洁”把每个小步骤都部署成独立函数。可按安全边界和调用频率合并：

```text
place-search
route-plan
route-candidates
ai-route
route-share
```

代码内部再拆模块。

---

## 26. 技术迁移边界

当出现以下需求时，考虑离开纯 GitHub Pages 静态部署：

- 需要 `/route/:id` 的服务端友好路由；
- 需要每条路线动态 SEO / Open Graph；
- 需要服务端首屏鉴权；
- 大量用户反馈中国大陆访问不稳定；
- 需要国内支付；
- 准备公开收费；
- 需要ICP备案和国内 CDN；
- 需要更稳定的后台任务。

迁移目标可以是：

- 支持 Next.js 服务端运行的平台；
- 国内云服务器或容器；
- 静态前端国内对象存储 + 国内 API；
- 独立 Node.js/FastAPI 后端。

由于数据访问、URL、AI 和地图均已封装，迁移时不应重写核心业务组件。

---

## 27. 最终技术决策

### MVP 保留

- Next.js App Router；
- React；
- TypeScript；
- Tailwind CSS；
- TanStack Query；
- Zustand；
- react-hook-form；
- Zod；
- dnd-kit；
- Supabase；
- 高德；
- DeepSeek；
- GitHub Pages。

### MVP 调整

- 路由改为固定静态页 + 查询参数；
- PostGIS 改为后续增强，不作为首阶段阻塞项；
- 统一保存并标记 GCJ-02 坐标；
- AI 生成改为多个短步骤；
- `generation_jobs` 先作为状态与幂等记录；
- 第一版只重点完成 Complete 模式；
- 历史和文学只生成短介绍，深读按需；
- 增加 RLS、限流、费用保护和降级；
- 建立固定路线测试样本。

### 后续按需增加

- PostGIS；
- Supabase Queues / pgmq；
- 独立 worker；
- 音乐主题；
- 城市时间切片；
- 登录后跨设备同步；
- 图片与游后纪念；
- 国内部署；
- 支付和会员。

---

## 28. 一句话定位

> **每一座城市都有很多种读法。**

辅助表达：

> AI 不替你决定去哪，而是陪你把一座城市逛得更有意思。

> 不是寻找更多景点，而是发现更多连接。

> 让一次漫游，像读完一本关于城市的书。

---

## 29. 参考技术文档

- Next.js Static Exports  
  https://nextjs.org/docs/app/guides/static-exports
- Next.js Dynamic Segments  
  https://nextjs.org/docs/app/api-reference/file-conventions/dynamic-routes
- Supabase Edge Functions Limits  
  https://supabase.com/docs/guides/functions/limits
- Supabase Background Tasks  
  https://supabase.com/docs/guides/functions/background-tasks
- Supabase Queues  
  https://supabase.com/docs/guides/queues
- Supabase PostGIS  
  https://supabase.com/docs/guides/database/extensions/postgis
- Supabase Row Level Security  
  https://supabase.com/docs/guides/database/postgres/row-level-security
- GitHub Pages Limits  
  https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits
- 高德坐标转换  
  https://lbs.amap.com/api/webservice/guide/api/convert
- 高德其他坐标转高德坐标  
  https://lbs.amap.com/api/javascript-api-v2/guide/transform/convertfrom
- DeepSeek JSON Output  
  https://api-docs.deepseek.com/zh-cn/guides/json_mode/
